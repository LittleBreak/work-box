import { Button } from '@renderer/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@renderer/components/ui/card'

function App(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center gap-6 p-8">
      <Card className="w-80">
        <CardHeader>
          <CardTitle>Work-Box</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button>Default Button</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default App
