import ky from 'ky'
const api = ky.create({ credentials: 'include' })
export { api }
