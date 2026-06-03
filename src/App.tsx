import { useEffect } from 'react'
import Main from './components/ui/Main'
import { initDatabase } from './components/services/database'

const App = () => {
  useEffect(() => {
    initDatabase().catch((error) => {
      console.error('Failed to initialize local database:', error)
    })
  }, [])

  return (
    <Main />
  )
}

export default App