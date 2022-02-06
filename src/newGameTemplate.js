import { ArcRotateCamera, HemisphericLight, MeshBuilder, Scene, Vector3 } from '@babylonjs/core'

let scene
let canvas

export default async function create(_engine, _canvas) {
  scene = new Scene(_engine)
  canvas = _canvas
  addCamera()
  addLight()
  const box = MeshBuilder.CreateBox('box', {}, scene)
  return scene
}

function addLight() {
  new HemisphericLight('light', new Vector3(0, 1, 0), scene)
}

function addCamera() {
  const camera = new ArcRotateCamera('camera', -1.925, 1.241, 29, new Vector3(), scene)
  camera.attachControl(canvas, true)
}
