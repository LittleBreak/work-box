import { useAppStore } from '../../stores/app.store'
import { Sidebar } from '../Sidebar/Sidebar'
import { HomeView } from '../../features/home/HomeView'
import { ChatView } from '../../features/chat/ChatView'
import { PluginListView } from '../../features/plugins/PluginListView'
import { SettingsView } from '../../features/settings/SettingsView'

function PageContent(): React.JSX.Element {
  const currentPage = useAppStore((s) => s.currentPage)

  switch (currentPage) {
    case 'home':
      return <HomeView />
    case 'chat':
      return <ChatView />
    case 'plugins':
      return <PluginListView />
    case 'settings':
      return <SettingsView />
  }
}

export function AppLayout(): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main data-testid="content" className="flex-1 overflow-auto">
        <PageContent />
      </main>
    </div>
  )
}
