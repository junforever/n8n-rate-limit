import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class RedisRateLimitApi implements ICredentialType {
	name = 'redisRateLimitApi';
	displayName = 'Redis Rate Limit API';
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'localhost',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 6379,
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'number',
			default: 0,
			description: 'The database number to connect to',
		},
	];
}
