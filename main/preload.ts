import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

const handler = {
  send(channel: string, value: any) {
    ipcRenderer.send(channel, value)
  },
  on(channel: string, callback: (...args: any[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, subscription)

    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
  invoke(channel: string, ...args: any[]) {
      return ipcRenderer.invoke(channel, ...args)
  },
  removeAllListeners(channel: string) {
      ipcRenderer.removeAllListeners(channel)
  }
}

contextBridge.exposeInMainWorld('ipc', handler)

export type IpcHandler = typeof handler
