import { switchMap, mergeMap, take } from 'rxjs/operators'
import { TargetRuntime, BUNDLER_TARGET, NODE_GLOBAL, MESSAGE_TYPE, FileType } from '../types'
import { stringify } from './utils'

const browserStr = data => stringify`
new Promise(resolve => {
  window.addEventListener('message', ({ data }) =>
    data.type === ${MESSAGE_TYPE.RUN_TEST_RESPONSE}
    && resolve(data))
  window.postMessage(${data}, '*')
})
`

const nodeStr = data => stringify`
new Promise(resolve => {
  global[${NODE_GLOBAL}].addListener('message', ({ data }) =>
    data.type === ${MESSAGE_TYPE.RUN_TEST_RESPONSE}
    && resolve(data))
  global[${NODE_GLOBAL}].emit('message', ${data})
})
`

const testStr = (options, data) =>
  options.target === BUNDLER_TARGET.BROWSER
    ? browserStr(data)
    : nodeStr(data)

export default
  (file, targetRuntimeProvider, options) =>
    mergeMap(test =>
      // @ts-ignore
      targetRuntimeProvider
      // @ts-ignore
      |> mergeMap(async (targetRuntime: TargetRuntime) => {
        await targetRuntime.loadFile(file)
        const { data: result } = await targetRuntime.exec(testStr(options, { type: MESSAGE_TYPE.RUN_TEST, description: test.description }))
        return {
          ...file,
          type: FileType.TEST,
          test: {
            ...test,
            ...result
          }
        }
      })
      // @ts-ignore
      |> take(1))