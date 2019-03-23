import { switchMap, map, mergeMap, take, delay } from 'rxjs/operators'
import { TargetRuntime, BUNDLER_TARGET, NODE_GLOBAL, MESSAGE_TYPE, File, FileType } from '../types'
import { stringify } from './utils'

const browserStr = data => stringify`
new Promise(resolve => {
  window.addEventListener('message', ({ data }) =>
    data.type === ${MESSAGE_TYPE.GET_TESTS_RESPONSE}
    && resolve(data))
  window.postMessage(${data}, '*')
})
`

const nodeStr = data => stringify`
new Promise(resolve => {
  global[${NODE_GLOBAL}].addListener('message', ({ data }) =>
    data.type === ${MESSAGE_TYPE.GET_TESTS_RESPONSE}
    && resolve(data))
  global[${NODE_GLOBAL}].emit('message', ${data})
})
`

const analyzeStr = (options, data) =>
  options.target === BUNDLER_TARGET.BROWSER
    ? browserStr(data)
    : nodeStr(data)

export default
  (targetRuntimeProvider, options) =>
    // @ts-ignore
    switchMap((file: File) =>
      // @ts-ignore
      targetRuntimeProvider
      // @ts-ignore
      |> mergeMap(async (targetRuntime: TargetRuntime) => {
        await targetRuntime.loadFile(file)
        const { data: tests, errors } = await targetRuntime.exec(analyzeStr(options, { type: MESSAGE_TYPE.GET_TESTS }))
        return {
          type: FileType.ANALYZE,
          ...file,
          tests,
          errors
        }
      })
      // @ts-ignore
      |> take(1))