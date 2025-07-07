# n8n Rate Limit Node with Redis

This is a custom node for n8n that allows you to implement a rate-limiting mechanism in your workflows using a Redis instance. It's perfect for preventing downstream services from being overloaded or for controlling API usage on a per-user basis.

## Features

- **Flexible Time Windows**: Configure limits per minute, hour, or day.
- **Dynamic Keys**: Use n8n expressions to create unique rate-limiting keys for different users, IP addresses, or any other data from your workflow.
- **Dual Outputs**: Easily branch your workflow based on whether the rate limit has been exceeded or not.
- **Standard Redis Credentials**: Uses a dedicated credential type for easy configuration.

## Installation

1.  Clone this repository.
2.  Navigate to the repository's root directory.
3.  Install dependencies: `npm install`
4.  Build the node: `npm run build`
5.  Link the node to your n8n installation:
    - Run `npm link` in this project's directory.
    - Run `npm link n8n-nodes-rate-limit` in your n8n installation directory.
6.  Restart your n8n instance.

## How to Use

After installation, you will find the **Rate Limit** node under the "Transform" section.

### Credentials

First, you'll need to configure your Redis credentials. Select "Redis Rate Limit API" from the credentials dropdown and fill in your Redis connection details (host, port, password, etc.).

### Parameters

-   **Redis Key**: The unique key used to store the counter in Redis. You can use n8n expressions here to make the key dynamic. For example, to limit based on a user ID from an incoming webhook, you could use `rate-limit-{{ $json.body.userId }}`.
-   **Limit**: The maximum number of requests allowed within the specified time window. For example, `100`.
-   **Time Period**: The duration of the time window. For example, `15`.
-   **Time Unit**: The unit for the time period. The options are `Minutes`, `Hours`, or `Days`.

**Example Configuration**: To allow a user 100 requests every 15 minutes, you would set:
-   **Limit**: `100`
-   **Time Period**: `15`
-   **Time Unit**: `Minutes`

### Outputs

The node has two outputs:

1.  **Not Exceeded (Top Output)**: If the current request count for the key is less than or equal to the limit, the workflow data will be passed through this output.
2.  **Exceeded (Bottom Output)**: If the limit has been surpassed, the data will be passed through this output. You can connect this to a node that sends an error message, for example.

## License

MIT
