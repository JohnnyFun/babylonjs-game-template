import { ActionManager, ArcRotateCamera, Axis, ExecuteCodeAction, HemisphericLight, MeshBuilder, Scene, TransformNode, Vector3 } from '@babylonjs/core'

let scene
let inputMap = {}

export default async function create(engine, canvas) {
  scene = new Scene(engine)
  const camera = new ArcRotateCamera('camera', -1.925, 1.241, 29, new Vector3(), scene)
  camera.attachControl(canvas, true)
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene)
  addInputTracking()
  addSpaceDebris()
  addSpaceShip()
  return scene
}

function addSpaceShip() {
  const spaceship = MeshBuilder.CreateBox('spaceship', {
    height: 2,
    width: 3,
    depth: 6,
  }, scene)
  spaceship.checkCollisions = true
  addSpaceshipControls(spaceship)
}

function addSpaceshipControls(spaceship) {
  const speed = .2
  const rotationSpeed = .05
  scene.onBeforeRenderObservable.add(() => {
    if (inputMap['w']) spaceship.moveWithCollisions(spaceship.forward.scaleInPlace(speed))
    if (inputMap['s']) spaceship.moveWithCollisions(spaceship.forward.scaleInPlace(-speed/2))
    if (inputMap['a']) spaceship.rotate(Axis.Y, -rotationSpeed)
    if (inputMap['d']) spaceship.rotate(Axis.Y, rotationSpeed)
  })
}

function addInputTracking() {
  scene.actionManager = new ActionManager(scene)
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, e => inputMap[e.sourceEvent.key] = true))
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, e => inputMap[e.sourceEvent.key] = false))
}

function addSpaceDebris() {
  const spaceRocks = new TransformNode('spacerocks')
  const spaceRock = MeshBuilder.CreateBox('spaceRock', {
    size: 3
  })
  spaceRock.position.z = 10
  spaceRock.checkCollisions = true
  // for ()
  spaceRock.parent = spaceRocks
}