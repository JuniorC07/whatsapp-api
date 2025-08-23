import { NotFoundError } from '../errors/index.js'

const notFoundHandler = () => {
  throw new NotFoundError({ context: 'resource' })
}

export default notFoundHandler
