/**
 * Swagger/OpenAPI Configuration
 * API documentation at /api/docs
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BillFlow Pro API',
      version: '1.0.0',
      description: 'Full-stack billing platform for SMBs in India',
      contact: {
        name: 'BillFlow Support',
        email: 'support@billflow.io',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://billflow.vercel.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session cookie for authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orgId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            country: { type: 'string' },
            pincode: { type: 'string' },
            gstin: { type: 'string' },
            pan: { type: 'string' },
            currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'GBP', 'JPY'] },
            creditLimit: { type: 'number' },
            outstanding: { type: 'number' },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Vendor: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orgId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            country: { type: 'string' },
            pincode: { type: 'string' },
            gstin: { type: 'string' },
            pan: { type: 'string' },
            bankAccount: { type: 'string' },
            ifsc: { type: 'string' },
            currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'GBP', 'JPY'] },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orgId: { type: 'string', format: 'uuid' },
            number: { type: 'string' },
            customerId: { type: 'string', format: 'uuid' },
            customerName: { type: 'string' },
            date: { type: 'string', format: 'date' },
            dueDate: { type: 'string', format: 'date' },
            currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'GBP', 'JPY'] },
            status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] },
            subtotal: { type: 'number' },
            discountPct: { type: 'number' },
            discountAmount: { type: 'number' },
            tax: { type: 'number' },
            total: { type: 'number' },
            notes: { type: 'string' },
            terms: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orgId: { type: 'string', format: 'uuid' },
            invoiceId: { type: 'string', format: 'uuid' },
            amount: { type: 'number' },
            date: { type: 'string', format: 'date' },
            currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'GBP', 'JPY'] },
            method: { type: 'string', enum: ['upi', 'neft', 'rtgs', 'imps', 'cash', 'card', 'cheque', 'wallet'] },
            reference: { type: 'string' },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Expense: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orgId: { type: 'string', format: 'uuid' },
            category: { type: 'string' },
            amount: { type: 'number' },
            date: { type: 'string', format: 'date' },
            vendorId: { type: 'string', format: 'uuid' },
            gstRate: { type: 'string', enum: ['0', '5', '12', '18', '28'] },
            reference: { type: 'string' },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['./backend/routes/*.js'], // Path to route files
};

const specs = swaggerJsdoc(options);

module.exports = specs;
