import { IExecuteFunctions } from 'n8n-workflow';
import {
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  NodeOperationError,
} from 'n8n-workflow';
import crypto from 'crypto';
import Redis from 'ioredis';

type RedisClient = InstanceType<typeof Redis>;

type RedisCredential = {
  host: string;
  port: number;
  ssl?: boolean;
  database: number;
  user?: string;
  password?: string;
};

function setupRedisClient(credentials: RedisCredential): RedisClient {
  return new Redis({
    host: credentials.host,
    port: credentials.port,
    tls: credentials.ssl ? {} : undefined,
    db: credentials.database,
    username: credentials.user || undefined,
    password: credentials.password || undefined,
    showFriendlyErrorStack: true,
  });
}

const incrExpireScript = `
  local current = redis.call("INCR", KEYS[1])
  if current == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
  end
  return current
`;

const blockAndResetScript = `
  redis.call("SET", KEYS[1], "", "EX", ARGV[1], "NX")
  redis.call("DEL", KEYS[2])
  return true
`;

async function runScript(
  redis: Redis,
  script: string,
  keys: string[],
  args: string[],
) {
  const sha1 = crypto.createHash('sha1').update(script).digest('hex');
  try {
    return await redis.evalsha(sha1, keys.length, ...keys, ...args);
  } catch (err: any) {
    if (err.message.includes('NOSCRIPT')) {
      return await redis.eval(script, keys.length, ...keys, ...args);
    }
    throw err;
  }
}

export class RateLimit implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Rate Limit',
    name: 'rateLimit',
    icon: 'file:icon.svg',
    group: ['transform'],
    version: 1,
    description: 'Limits the rate of executions using Redis.',
    defaults: {
      name: 'Rate Limit',
    },
    inputs: ['main'] as unknown as any,
    outputs: ['main', 'main'] as unknown as any,
    outputNames: ['Not Exceeded', 'Exceeded'],
    credentials: [
      {
        name: 'redis',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Redis Limit Counter Key',
        name: 'key',
        type: 'string',
        default: '',
        required: true,
        description:
          'The base key for the rate limit counter. Can use expressions to make it dynamic (e.g., `rate-limit-{{ $json.userId }}`)',
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1 },
        default: 60,
        description:
          'Maximum number of requests allowed in the defined time window.',
      },
      {
        displayName: 'Time Period',
        name: 'timePeriod',
        type: 'number',
        typeOptions: { minValue: 1 },
        default: 1,
        description: 'The duration of the time window.',
      },
      {
        displayName: 'Time Unit',
        name: 'timeUnit',
        type: 'options',
        options: [
          { name: 'Minutes', value: 'minutes' },
          { name: 'Hours', value: 'hours' },
          { name: 'Days', value: 'days' },
        ],
        default: 'minutes',
        description: 'The unit of time for the time window.',
      },
      {
        displayName: 'Redis Block Key',
        name: 'blockKey',
        type: 'string',
        default: '',
        required: true,
        description:
          'The base key for the block time. Can use expressions to make it dynamic (e.g., `rate-limit-block-{{ $json.userId }}`)',
      },
      {
        displayName: 'Block Time Period',
        name: 'blockTimePeriod',
        type: 'number',
        typeOptions: { minValue: 1 },
        default: 1,
        description: 'The duration of the block time window.',
      },
      {
        displayName: 'Block Time Unit',
        name: 'blockTimeUnit',
        type: 'options',
        options: [
          { name: 'Minutes', value: 'minutes' },
          { name: 'Hours', value: 'hours' },
          { name: 'Days', value: 'days' },
        ],
        default: 'minutes',
        description: 'The unit of time for the block time window.',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const notExceededItems: INodeExecutionData[] = [];
    const exceededItems: INodeExecutionData[] = [];

    const credentials = await this.getCredentials('redis');
    if (!credentials) {
      throw new NodeOperationError(
        this.getNode(),
        'Redis credentials are not configured for this node.',
      );
    }

    const redis = setupRedisClient(credentials as RedisCredential);
    let i = 0;
    try {
      for (i = 0; i < items.length; i++) {
        const key = this.getNodeParameter('key', i, '') as string;
        const limit = this.getNodeParameter('limit', i, 60) as number;
        const timePeriod = this.getNodeParameter('timePeriod', i, 1) as number;
        const timeUnit = this.getNodeParameter(
          'timeUnit',
          i,
          'minutes',
        ) as string;
        const blockKey = this.getNodeParameter('blockKey', i, '') as string;
        const blockTimePeriod = this.getNodeParameter(
          'blockTimePeriod',
          i,
          1,
        ) as number;
        const blockTimeUnit = this.getNodeParameter(
          'blockTimeUnit',
          i,
          'minutes',
        ) as string;

        if (!key) {
          notExceededItems.push(items[i]);
          continue;
        }

        if (!blockKey) {
          throw new NodeOperationError(
            this.getNode(),
            'Block key is required.',
          );
        }

        let ttlInSeconds: number;
        switch (timeUnit) {
          case 'hours':
            ttlInSeconds = timePeriod * 3600;
            break;
          case 'days':
            ttlInSeconds = timePeriod * 86400;
            break;
          case 'minutes':
          default:
            ttlInSeconds = timePeriod * 60;
            break;
        }

        let ttlBlockInSeconds: number;
        switch (blockTimeUnit) {
          case 'hours':
            ttlBlockInSeconds = blockTimePeriod * 3600;
            break;
          case 'days':
            ttlBlockInSeconds = blockTimePeriod * 86400;
            break;
          case 'minutes':
          default:
            ttlBlockInSeconds = blockTimePeriod * 60;
            break;
        }

        const blockKeyExists = await redis.exists(blockKey);
        if (blockKeyExists) {
          exceededItems.push(items[i]);
          continue;
        }

        const count = (await runScript(
          redis,
          incrExpireScript,
          [key],
          [ttlInSeconds.toString()],
        )) as number;

        if (count <= limit) {
          notExceededItems.push(items[i]);
        } else if (count === limit + 1) {
          await runScript(
            redis,
            blockAndResetScript,
            [blockKey, key],
            [ttlBlockInSeconds.toString()],
          );
          exceededItems.push(items[i]);
        }
      }
    } catch (error) {
      throw new NodeOperationError(
        this.getNode(),
        `Rate limit operation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { itemIndex: i },
      );
    } finally {
      await redis.quit();
    }

    return [
      this.helpers.returnJsonArray(notExceededItems),
      this.helpers.returnJsonArray(exceededItems),
    ];
  }
}
