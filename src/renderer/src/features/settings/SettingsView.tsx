import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs";
import { Label } from "@renderer/components/ui/label";
import { Input } from "@renderer/components/ui/input";
import { Button } from "@renderer/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@renderer/components/ui/select";
import { Slider } from "@renderer/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@renderer/components/ui/radio-group";
import { useAppStore } from "@renderer/stores/app.store";
import type { AppSettings } from "@shared/types";
import { DEFAULT_SETTINGS } from "@shared/types";

export function SettingsView(): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.workbox.settings.get().then((data) => {
      setSettings(data);
      setLoaded(true);
    });
  }, []);

  const handleThemeChange = (value: string): void => {
    const theme = value as "light" | "dark";
    setSettings((prev) => ({ ...prev, theme }));
    useAppStore.getState().setTheme(theme);
  };

  const handleSave = async (): Promise<void> => {
    await window.workbox.settings.update(settings);
  };

  const handleReset = async (): Promise<void> => {
    await window.workbox.settings.reset();
    setSettings({ ...DEFAULT_SETTINGS });
    useAppStore.getState().setTheme(DEFAULT_SETTINGS.theme);
  };

  if (!loaded) {
    return (
      <div data-testid="page-settings" className="flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
    );
  }

  return (
    <div data-testid="page-settings" className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="plugin">Plugin</TabsTrigger>
        </TabsList>

        {/* 通用设置 Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="space-y-3">
            <Label>Theme</Label>
            <RadioGroup value={settings.theme} onValueChange={handleThemeChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="theme-dark" />
                <Label htmlFor="theme-dark">Dark</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="theme-light" />
                <Label htmlFor="theme-light">Light</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Language</Label>
            <Select
              value={settings.language}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, language: value as "en" | "zh" }))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        {/* AI 设置 Tab */}
        <TabsContent value="ai" className="space-y-6">
          <div className="space-y-3">
            <Label>AI Provider</Label>
            <Select
              value={settings.aiProvider}
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  aiProvider: value as "openai" | "claude" | "custom"
                }))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={settings.aiApiKey}
              onChange={(e) => setSettings((prev) => ({ ...prev, aiApiKey: e.target.value }))}
              placeholder="sk-..."
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="base-url">Base URL</Label>
            <Input
              id="base-url"
              value={settings.aiBaseUrl}
              onChange={(e) => setSettings((prev) => ({ ...prev, aiBaseUrl: e.target.value }))}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={settings.aiModel}
              onChange={(e) => setSettings((prev) => ({ ...prev, aiModel: e.target.value }))}
            />
          </div>

          <div className="space-y-3">
            <Label>Temperature: {settings.aiTemperature}</Label>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={[settings.aiTemperature]}
              onValueChange={([value]) =>
                setSettings((prev) => ({ ...prev, aiTemperature: value }))
              }
            />
          </div>
        </TabsContent>

        {/* 插件设置 Tab */}
        <TabsContent value="plugin" className="space-y-6">
          <div className="space-y-3">
            <Label>Plugin Directory</Label>
            <Input value={settings.pluginDir} readOnly className="bg-muted" />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2">
        <Button onClick={handleSave}>Save</Button>
        <Button variant="outline" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
