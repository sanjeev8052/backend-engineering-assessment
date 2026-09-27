import swaggerJSDoc from 'swagger-jsdoc';
import { ENV } from './env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Orders Ingestion API — Sharded Backend',
      version: '1.0.0',
      description: 'API documentation for CSV order ingestion, shard routing, and order queries.',
    },
    servers: [
      {
        url: `http://localhost:${ENV.PORT}`,
        description: 'Local Development Server',
      },
    ],
    paths: {
      '/upload-orders': {
        post: {
          summary: 'Upload CSV file of orders for sharded ingestion',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                      description: 'CSV file containing order records',
                    },
                  },
                  required: ['file'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Orders successfully ingested and sharded across databases',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                      gcsPath: { type: 'string', nullable: true },
                      metrics: {
                        type: 'object',
                        properties: {
                          totalProcessed: { type: 'integer' },
                          inserted: { type: 'integer' },
                          skipped: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'No file uploaded or invalid request payload',
            },
          },
        },
      },
      '/orders': {
        get: {
          summary: 'Get all orders for a specific customer ID',
          parameters: [
            {
              name: 'customerId',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'Customer ID',
            },
          ],
          responses: {
            '200': {
              description: 'Orders returned from customer shard',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      count: { type: 'integer' },
                      orders: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            order_id: { type: 'string' },
                            customer_id: { type: 'string' },
                            order_date: { type: 'string', format: 'date-time' },
                            order_amount: { type: 'string' },
                            status: { type: 'string' },
                            created_at: { type: 'string', format: 'date-time' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Missing customerId query parameter',
            },
          },
        },
      },
      '/orders/{orderId}': {
        get: {
          summary: 'Get a specific order by Order ID',
          parameters: [
            {
              name: 'orderId',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'Order ID',
            },
            {
              name: 'customerId',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
              description: 'Optional customer ID for direct shard lookup',
            },
          ],
          responses: {
            '200': {
              description: 'Order details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      order: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          order_id: { type: 'string' },
                          customer_id: { type: 'string' },
                          order_date: { type: 'string', format: 'date-time' },
                          order_amount: { type: 'string' },
                          status: { type: 'string' },
                          created_at: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/health': {
        get: {
          summary: 'Health check endpoint',
          responses: {
            '200': {
              description: 'All shards are connected and healthy',
            },
            '500': {
              description: 'One or more shards are unreachable',
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJSDoc(options);
