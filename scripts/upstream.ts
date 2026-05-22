const port = Number(Bun.env.UPSTREAM_PORT ?? 4000)

Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', service: 'upstream' })
    }

    return Response.json({ ok: true, path: url.pathname })
  }
})

console.log(`Benchmark upstream listening on http://localhost:${port}`)
