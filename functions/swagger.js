const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const swaggerDocument = YAML.load(path.join(__dirname, 'swagger', 'swagger.yaml'));

module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(swaggerDocument),
};
