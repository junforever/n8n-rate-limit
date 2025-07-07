import { IExecuteFunctions } from 'n8n-workflow';
import {
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
} from 'n8n-workflow';
import Redis from 'ioredis';

export class RateLimit implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Rate Limit',
    name: 'rateLimit',
    icon: 'fa:gauge-high',
    group: ['transform'],
    version: 1,
    description: 'Limits the rate of executions using Redis.',
    defaults: {
      name: 'Rate Limit',
    },
    inputs: ['main'],
    outputs: ['main', 'main'],
    outputNames: ['Not Exceeded', 'Exceeded'],
    credentials: [
      {
        name: 'redisRateLimitApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Redis Key',
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
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const notExceededItems: INodeExecutionData[] = [];
    const exceededItems: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const key = this.getNodeParameter('key', i, '') as string;
      const limit = this.getNodeParameter('limit', i, 60) as number;
      const timePeriod = this.getNodeParameter('timePeriod', i, 1) as number;
      const timeUnit = this.getNodeParameter(
        'timeUnit',
        i,
        'minutes',
      ) as string;

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

      const credentials = await this.getCredentials('redisRateLimitApi', i);
      const redis = new Redis({
        host: credentials.host as string,
        port: credentials.port as number,
        username: credentials.user as string,
        password: credentials.password as string,
        db: credentials.database as number,
      });

      try {
        const pipeline = redis.pipeline();
        pipeline.incr(key);
        pipeline.ttl(key);
        const results = await pipeline.exec();

        if (!results) {
          throw new Error('Failed to execute Redis pipeline');
        }

        const countResult = results[0];
        const ttlResult = results[1];

        if (countResult[0]) throw countResult[0];
        if (ttlResult[0]) throw ttlResult[0];

        const count = countResult[1] as number;
        const ttl = ttlResult[1] as number;

        if (ttl === -1) {
          await redis.expire(key, ttlInSeconds);
        }

        if (count <= limit) {
          notExceededItems.push(items[i]);
        } else {
          exceededItems.push(items[i]);
        }
      } finally {
        await redis.quit();
      }
    }

    return [
      this.helpers.returnJsonArray(notExceededItems),
      this.helpers.returnJsonArray(exceededItems),
    ];
  }
}
