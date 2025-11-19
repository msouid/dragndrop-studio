import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { items } from '../../utils/items'

export const Route = createFileRoute('/api/items')({
  server: {
    handlers: {
      GET: async () => {
        return json(items)
      },
    },
  },
})
