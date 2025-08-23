import swaggerAutogen from 'swagger-autogen'

const doc = {
  info: {
    title: 'Whatsapp - API',
    description: 'A simple api developed in node',
  },
  host: 'localhost:3000',
}

const outputFile = './src/docs/swagger-output.json'
const routes = ['./src/routes/index.js']

swaggerAutogen()(outputFile, routes, doc)
