import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

const ffmpeg = new FFmpeg()

let loaded = false

async function loadFFmpeg() {
  if (loaded) return

  await ffmpeg.load({
    coreURL:
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
    wasmURL:
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
  })

  loaded = true
}

export async function mixVideoAudio(videoFile, audioUrl, onProgress) {
  await loadFFmpeg()

  if (onProgress) {
    onProgress('⏳ Ana shirya video da waƙa...')
  }

  const videoData = await fetchFile(videoFile)

  const audioResponse = await fetch(audioUrl)

  if (!audioResponse.ok) {
    throw new Error('An kasa ɗaukar waƙar.')
  }

  const audioBlob = await audioResponse.blob()
  const audioData = await fetchFile(audioBlob)

  await ffmpeg.writeFile('input.mp4', videoData)
  await ffmpeg.writeFile('sound.mp3', audioData)

  if (onProgress) {
    onProgress('🎵 Ana haɗa waƙa da video...')
  }

  await ffmpeg.exec([
    '-i',
    'input.mp4',
    '-i',
    'sound.mp3',
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-shortest',
    'output.mp4',
  ])

  const output = await ffmpeg.readFile('output.mp4')

  return new File(
    [output.buffer],
    'myapp-video.mp4',
    {
      type: 'video/mp4',
    }
  )
}
