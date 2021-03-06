import { ArcRotateCamera, HemisphericLight, MeshBuilder, Scene, Vector3 } from '@babylonjs/core'

let scene

export default async function create(engine, canvas) {
  scene = new Scene(engine)
  const camera = new ArcRotateCamera('camera', 7.331, 1.039, 29, new Vector3(), scene)
  camera.attachControl(canvas, true)
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene)
  const box = MeshBuilder.CreateBox('box', {}, scene)
  return scene
}