import { config } from './config/env'
import { createApp } from './app'

const port = config.port

const app = createApp().listen(port)

console.log(`BriskRoute listening on http://localhost:${app.server?.port ?? port}`)

export type { App } from './app'
