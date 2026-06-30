import { useEffect, useState } from 'react'
import api from './lib/axios'

function App() {
  const [status, setStatus] = useState('comprobando...')

  useEffect(() => {
    api.get('/api/health')
      .then(res => setStatus(res.data.status))
      .catch(() => setStatus('error al conectar'))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-purple-400 mb-4">
          Troncodrilo Shop
        </h1>
        <p className="text-gray-400">
          Backend: <span className="text-green-400">{status}</span>
        </p>
      </div>
    </div>
  )
}

export default App