import { vi, describe, it, expect } from 'vitest'
import {
  exec,
  isDangerousCommand,
  filterEnv,
  setupShellHandlers,
  DEFAULT_TIMEOUT
} from './shell.handler'

describe('shell.handler', () => {
  describe('exec', () => {
    // 正常路径：执行简单命令
    it('执行 echo 命令返回 stdout', async () => {
      const result = await exec('echo hello')
      expect(result.stdout.trim()).toBe('hello')
      expect(result.exitCode).toBe(0)
    })

    // 正常路径：命令失败返回非零 exitCode（不 throw）
    it('命令失败时返回非零 exitCode 和 stderr', async () => {
      const result = await exec('ls /nonexistent_path_12345')
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toBeTruthy()
    })

    // 正常路径：支持自定义 cwd
    it('支持自定义工作目录', async () => {
      const result = await exec('pwd', { cwd: '/tmp' })
      expect(result.stdout.trim()).toContain('/tmp')
    })

    // 边界条件：空命令
    it('空命令抛出错误', async () => {
      await expect(exec('')).rejects.toThrow()
    })
  })

  describe('超时保护', () => {
    // 正常路径：超时后返回非零 exitCode 和 signal
    it('命令超时后返回非零 exitCode 和 SIGTERM signal', async () => {
      const result = await exec('sleep 10', { timeout: 500 })
      expect(result.exitCode).not.toBe(0)
      expect(result.signal).toBe('SIGTERM')
      expect(result.stderr).toBeTruthy() // 包含超时相关信息
    }, 5000)

    // 正常路径：默认超时 30s（通过导出常量验证）
    it('默认超时为 30 秒', () => {
      expect(DEFAULT_TIMEOUT).toBe(30000)
    })
  })

  describe('危险命令检测', () => {
    // 安全：拦截 rm -rf /
    it('拒绝 rm -rf /', async () => {
      await expect(exec('rm -rf /')).rejects.toThrow(/dangerous/i)
    })

    // 安全：拦截 sudo
    it('拒绝 sudo 命令', async () => {
      await expect(exec('sudo rm file')).rejects.toThrow(/dangerous/i)
    })

    // 安全：拦截 dd（词边界匹配）
    it('拒绝 dd 命令', async () => {
      await expect(exec('dd if=/dev/zero of=/dev/sda')).rejects.toThrow(/dangerous/i)
    })

    // 安全：拦截 mkfs（词边界匹配，含子命令如 mkfs.ext4）
    it('拒绝 mkfs 命令', async () => {
      await expect(exec('mkfs.ext4 /dev/sda1')).rejects.toThrow(/dangerous/i)
    })

    // 正常路径：允许安全命令
    it('允许安全命令通过', async () => {
      const result = await exec('echo safe')
      expect(result.exitCode).toBe(0)
    })

    // 边界条件：rm 非根目录不拦截
    it('允许 rm 非根目录命令', async () => {
      // rm -rf ./tmp 不应被拦截（只拦截 rm -rf / 根路径）
      await expect(exec('rm -rf ./tmp')).resolves.not.toThrow()
    })

    // 边界条件：包含黑名单子串但非独立命令的不拦截
    it('不误拦含黑名单子串的安全命令', async () => {
      // "adding" 包含 "dd"，但不应被拦截
      const result = await exec('echo adding')
      expect(result.exitCode).toBe(0)
    })
  })

  describe('环境变量过滤', () => {
    it('过滤含 KEY/SECRET/TOKEN/PASSWORD/CREDENTIAL 的变量', () => {
      const env = filterEnv({
        PATH: '/usr/bin',
        HOME: '/home/user',
        API_KEY: 'secret123',
        DB_PASSWORD: 'pass',
        MY_TOKEN: 'tok',
        AWS_SECRET_ACCESS_KEY: 'aws',
        NORMAL_VAR: 'ok'
      })
      expect(env.PATH).toBe('/usr/bin')
      expect(env.HOME).toBe('/home/user')
      expect(env.NORMAL_VAR).toBe('ok')
      expect(env).not.toHaveProperty('API_KEY')
      expect(env).not.toHaveProperty('DB_PASSWORD')
      expect(env).not.toHaveProperty('MY_TOKEN')
      expect(env).not.toHaveProperty('AWS_SECRET_ACCESS_KEY')
    })

    it('options.env 合并覆盖到过滤后的环境变量', () => {
      const env = filterEnv(
        { PATH: '/usr/bin', API_KEY: 'secret' },
        { CUSTOM: 'value', PATH: '/custom/bin' }
      )
      expect(env.PATH).toBe('/custom/bin') // options.env 覆盖
      expect(env.CUSTOM).toBe('value')
      expect(env).not.toHaveProperty('API_KEY')
    })
  })

  describe('isDangerousCommand', () => {
    it('使用词边界匹配，不误判子串', () => {
      expect(isDangerousCommand('echo adding')).toBe(false)
      expect(isDangerousCommand('dd if=/dev/zero of=/dev/sda')).toBe(true)
    })

    it('拦截 rm -rf / 及其变体但不拦截非根路径', () => {
      expect(isDangerousCommand('rm -rf /')).toBe(true)
      expect(isDangerousCommand('rm -rf /*')).toBe(true)
      expect(isDangerousCommand('rm -rf ./dir')).toBe(false)
    })
  })

  describe('setupShellHandlers', () => {
    it('注册 shell:exec channel', () => {
      const handleFn = vi.fn()
      const mockIpcMain = { handle: handleFn } as unknown as Electron.IpcMain
      setupShellHandlers(mockIpcMain)
      expect(handleFn).toHaveBeenCalledWith('shell:exec', expect.any(Function))
    })

    it('handler wrapper 正确传递参数给 exec', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let registeredHandler: ((...args: any[]) => any) | undefined
      const mockIpcMain = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handle: vi.fn((_channel: string, handler: (...args: any[]) => any) => {
          registeredHandler = handler
        })
      } as unknown as Electron.IpcMain
      setupShellHandlers(mockIpcMain)
      const result = await registeredHandler!({}, 'echo test')
      expect(result.stdout.trim()).toBe('test')
      expect(result.exitCode).toBe(0)
    })
  })
})
