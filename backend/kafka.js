const { Kafka } = require('kafkajs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const KAFKA_BROKER = process.env.KAFKA_BROKER;
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'street-connect-backend';

if (!KAFKA_BROKER) {
  console.error("Missing KAFKA_BROKER in .env");
  process.exit(1);
}

const kafka = new Kafka({
  clientId: KAFKA_CLIENT_ID,
  brokers: [KAFKA_BROKER],
  ssl: {
    rejectUnauthorized: true,
    ca: [fs.readFileSync(path.join(__dirname, 'certs', 'ca.pem'), 'utf-8')],
    key: fs.readFileSync(path.join(__dirname, 'certs', 'service.key'), 'utf-8'),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'service.cert'), 'utf-8'),
  },
});

module.exports = kafka;
