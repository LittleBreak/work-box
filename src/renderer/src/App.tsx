import { useEffect } from 'react'
import { AppLayout } from '@renderer/components/Layout/AppLayout'
import { useAppStore } from '@renderer/stores/app.store'

function App(): React.JSX.Element {
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return <AppLayout />
}

export default App
