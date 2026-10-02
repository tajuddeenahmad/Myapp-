import { registerPlugin } from '@capacitor/core'

const TajVidCamera = registerPlugin('TajVidCamera')

export async function openTajVidCamera() {
  return TajVidCamera.open()
}

export async function closeTajVidCamera() {
  return TajVidCamera.close()
}

export default TajVidCamera
