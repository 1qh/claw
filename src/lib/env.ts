const required = (key: string): string => {
  const value = process.env[key]
  if (!value) throw new Error(`Missing env: ${key}`)
  return value
}

const env = {
  E2B_API_KEY: required('E2B_API_KEY'),
  WS_PORT: Number(process.env.WS_PORT ?? '3001'),
}

export { env }
