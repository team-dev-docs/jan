import {
  fs,
  joinPath,
  ConversationalExtension,
  Thread,
  ThreadMessage,
} from '@janhq/core'

/**
 * JSONConversationalExtension is a ConversationalExtension implementation that provides
 * functionality for managing threads.
 */
export default class JSONConversationalExtension
  extends ConversationalExtension
{
  private static readonly _homeDir = 'file://threads'
  private static readonly _threadInfoFileName = 'thread.json'
  private static readonly _threadMessagesFileName = 'messages.jsonl'

  /**
   * Called when the extension is loaded.
   */
  async onLoad() {
    if (!(await fs.existsSync(JSONConversationalExtension._homeDir)))
      await fs.mkdirSync(JSONConversationalExtension._homeDir)
    console.debug('JSONConversationalExtension loaded')
  }

  /**
   * Called when the extension is unloaded.
   */
  onUnload() {
    console.debug('JSONConversationalExtension unloaded')
  }

  /**
   * Returns a Promise that resolves to an array of Conversation objects.
   */
  async getThreads(): Promise<Thread[]> {
    try {
      const threadDirs = await this.getValidThreadDirs()

      const promises = threadDirs.map((dirName) => this.readThread(dirName))
      const promiseResults = await Promise.allSettled(promises)
      const convos = promiseResults
        .map((result) => {
          if (result.status === 'fulfilled') {
            return typeof result.value === 'object'
              ? result.value
              : JSON.parse(result.value)
          }
        })
        .filter((convo) => convo != null)
      convos.sort(
        (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
      )

      return convos
    } catch (error) {
      console.error(error)
      return []
    }
  }

  /**
   * Saves a Thread object to a json file.
   * @param thread The Thread object to save.
   */
  async saveThread(thread: Thread): Promise<void> {
    try {
      const threadDirPath = await joinPath([
        JSONConversationalExtension._homeDir,
        thread.id,
      ])
      const threadJsonPath = await joinPath([
        threadDirPath,
        JSONConversationalExtension._threadInfoFileName,
      ])
      if (!(await fs.existsSync(threadDirPath))) {
        await fs.mkdirSync(threadDirPath)
      }

      await fs.writeFileSync(threadJsonPath, JSON.stringify(thread, null, 2))
    } catch (err) {
      console.error(err)
      Promise.reject(err)
    }
  }

  /**
   * Delete a thread with the specified ID.
   * @param threadId The ID of the thread to delete.
   */
  async deleteThread(threadId: string): Promise<void> {
    const path = await joinPath([
      JSONConversationalExtension._homeDir,
      `${threadId}`,
    ])
    try {
      if (await fs.existsSync(path)) {
        await fs.rmdirSync(path, { recursive: true })
      } else {
        console.debug(`${path} does not exist`)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async addNewMessage(message: ThreadMessage): Promise<void> {
    try {
      const threadDirPath = await joinPath([
        JSONConversationalExtension._homeDir,
        message.thread_id,
      ])
      const threadMessagePath = await joinPath([
        threadDirPath,
        JSONConversationalExtension._threadMessagesFileName,
      ])
      if (!(await fs.existsSync(threadDirPath)))
        await fs.mkdirSync(threadDirPath)
      await fs.appendFileSync(threadMessagePath, JSON.stringify(message) + '\n')
      Promise.resolve()
    } catch (err) {
      Promise.reject(err)
    }
  }

  async writeMessages(
    threadId: string,
    messages: ThreadMessage[]
  ): Promise<void> {
    try {
      const threadDirPath = await joinPath([
        JSONConversationalExtension._homeDir,
        threadId,
      ])
      const threadMessagePath = await joinPath([
        threadDirPath,
        JSONConversationalExtension._threadMessagesFileName,
      ])
      if (!(await fs.existsSync(threadDirPath)))
        await fs.mkdirSync(threadDirPath)
      await fs.writeFileSync(
        threadMessagePath,
        messages.map((msg) => JSON.stringify(msg)).join('\n') +
          (messages.length ? '\n' : '')
      )
      Promise.resolve()
    } catch (err) {
      Promise.reject(err)
    }
  }

  /**
   * A promise builder for reading a thread from a file.
   * @param threadDirName the thread dir we are reading from.
   * @returns data of the thread
   */
  private async readThread(threadDirName: string): Promise<any> {
    return fs.readFileSync(
      await joinPath([
        JSONConversationalExtension._homeDir,
        threadDirName,
        JSONConversationalExtension._threadInfoFileName,
      ]),
      'utf-8'
    )
  }

  /**
   * Returns a Promise that resolves to an array of thread directories.
   * @private
   */
  private async getValidThreadDirs(): Promise<string[]> {
    const fileInsideThread: string[] = await fs.readdirSync(
      JSONConversationalExtension._homeDir
    )

    const threadDirs: string[] = []
    for (let i = 0; i < fileInsideThread.length; i++) {
      if (fileInsideThread[i].includes('.DS_Store')) continue
      const path = await joinPath([
        JSONConversationalExtension._homeDir,
        fileInsideThread[i],
      ])

      const isHavingThreadInfo = (await fs.readdirSync(path)).includes(
        JSONConversationalExtension._threadInfoFileName
      )
      if (!isHavingThreadInfo) {
        console.debug(`Ignore ${path} because it does not have thread info`)
        continue
      }

      threadDirs.push(fileInsideThread[i])
    }
    return threadDirs
  }

  async getAllMessages(threadId: string): Promise<ThreadMessage[]> {
    try {
      const threadDirPath = await joinPath([
        JSONConversationalExtension._homeDir,
        threadId,
      ])

      const files: string[] = await fs.readdirSync(threadDirPath)
      if (
        !files.includes(JSONConversationalExtension._threadMessagesFileName)
      ) {
        console.debug(`${threadDirPath} not contains message file`)
        return []
      }

      const messageFilePath = await joinPath([
        threadDirPath,
        JSONConversationalExtension._threadMessagesFileName,
      ])

      const result = await fs
        .readFileSync(messageFilePath, 'utf-8')
        .then((content) =>
          content
            .toString()
            .split('\n')
            .filter((line) => line !== '')
        )

      const messages: ThreadMessage[] = []
      result.forEach((line: string) => {
        messages.push(JSON.parse(line) as ThreadMessage)
      })
      return messages
    } catch (err) {
      console.error(err)
      return []
    }
  }
}
