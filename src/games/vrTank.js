// TODO: 
// make controls work in and outside of VR? keyboard equivalents
// don't add physics til have basic controls in place and working outside of VR (want to see if I can keep it efficent as possible...)
// make simple tank turret
// put user on top of tank
// left joy stick turns turret
// right 

// OR
// make it a mounted machine gun that you grab with hands
// TODO: how to "grab" a mesh--when hand is within some distance to a mesh and the inside trigger is squeezed, attach the mesh by that point to the controller mesh! 
// THEN, when you move your hand the gun should move accordingly! BUt you'd also need the gun attached to the turret...

import { ActionManager, ArcRotateCamera, Axis, Color3, ExecuteCodeAction, FollowCamera, GizmoManager, HemisphericLight, MeshBuilder, PhysicsImpostor, Scene, StandardMaterial, Texture, Tools, Vector3 } from '@babylonjs/core'

let canvas
let scene
let inputMap = {}

export default async function create(engine, _canvas) {
  canvas = _canvas
  scene = new Scene(engine)
  // const camera = new ArcRotateCamera('camera', -1.925, 1.241, 29, new Vector3(), scene)
  // camera.attachControl(canvas, true)
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene)
  addInputTracking()
  addGround()
  addTank()
  return scene
}


function addTank() {
  const tankMaterial = new StandardMaterial('tankPain', scene)
  const tankBumpTexture = new Texture('/textures/logwall.jpg', scene)
  tankMaterial.bumpTexture = tankBumpTexture
  tankMaterial.diffuseColor = Color3.FromHexString('#264514')
  
  const body = MeshBuilder.CreateBox('body', {
    height: 2,
    width: 6,
    depth: 10,
  }, scene)
  body.material = tankMaterial

  const turret = MeshBuilder.CreateBox('turret', {
    height: 1.3,
    width: 5,
    depth: 6,
  }, scene)
  turret.position.y = 2
  turret.material = tankMaterial
  // turret.rotation.y = Math.PI / 4
  turret.parent = body

  const barrel = MeshBuilder.CreateCylinder('barrel', {
    diameterBottom: .9,
    diameterTop: .6,
    height: 7,
  })
  barrel.setPivotPoint(new Vector3(0, -3.5, 0)) // rotate from base of barrel
  barrel.position.y = 3.5
  barrel.position.z = 2.8
  barrel.rotation.x = Math.PI / 2.3
  barrel.material = tankMaterial
  barrel.parent = turret

  const camera = addCharacterCamera(turret)
  addTankControls(body, camera)
  addTurretControls(turret)
  addBarrelControls(barrel)
  return body
}

function addInputTracking() {
  scene.actionManager = new ActionManager(scene)
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, e => inputMap[e.sourceEvent.key] = true))
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, e => inputMap[e.sourceEvent.key] = false))
}

function addTankControls(tankBody, camera) {
  // we change camera's rotationOffset, so it is always directly behind turret, even if the tank body turns
  const tankSpeed = .2
  const tankRotationSpeed = .05
  let animating = false
  scene.onBeforeRenderObservable.add(() => {
    animating = false
    if (inputMap['w']) {
      tankBody.moveWithCollisions(tankBody.forward.scaleInPlace(tankSpeed))
    }
    if (inputMap['s']) {
      tankBody.moveWithCollisions(tankBody.forward.scaleInPlace(-tankSpeed/2))
    }
    if (inputMap['a']) {
      tankBody.rotate(Axis.Y, -tankRotationSpeed)
      camera.rotationOffset -= Tools.ToDegrees(tankRotationSpeed)
    }
    if (inputMap['d']) {
      tankBody.rotate(Axis.Y, tankRotationSpeed)
      camera.rotationOffset += Tools.ToDegrees(tankRotationSpeed)
    }
  })
}

function addTurretControls(turret) {
  const turretRotationSpeed = .05
  scene.onBeforeRenderObservable.add(() => {
    if (inputMap['ArrowLeft']) turret.rotate(Axis.Y, -turretRotationSpeed)
    if (inputMap['ArrowRight']) turret.rotate(Axis.Y, turretRotationSpeed)
  })
}

function addBarrelControls(barrel) {
  const barrelRotationSpeed = .005
  const maxBarrelDownward = Tools.ToRadians(89.1)
  const maxBarrelUpward = Tools.ToRadians(58)
  scene.onBeforeRenderObservable.add(() => {
    if (inputMap['ArrowUp']) barrel.addRotation(-barrelRotationSpeed, 0, 0)
    if (inputMap['ArrowDown']) barrel.addRotation(barrelRotationSpeed, 0, 0)
    if (barrel.rotation.x < maxBarrelUpward) barrel.rotation.x = maxBarrelUpward
    if (barrel.rotation.x > maxBarrelDownward) barrel.rotation.x = maxBarrelDownward
  })
}

function addGround() {
  // const arenaSize = 100
  // const ground = MeshBuilder.CreateGroundFromHeightMap('ground', '/textures/ground-height-map.png', {
  //   width: arenaSize,
  //   height: arenaSize,
  //   subdivisions: 10, // splits it into 20x20 grid. so 400 sections for good nuff resolution
  //   minHeight: 0,
  //   maxHeight: 10,
  // })
  // const groundMaterial = new StandardMaterial('groundMaterial', scene)
  // // const grassTexture = new GrassProceduralTexture('grassTexture', arenaSize*arenaSize, scene)
  // const groundTexture = new Texture('/textures/snow-medium.jpg', scene)
  // groundMaterial.diffuseTexture = groundTexture
  // // groundMaterial.ambientTexture = groundTexture // ambient handles shadows
  // ground.material = groundMaterial
  // ground.position.y = -.1
  // ground.collission


  const arenaSize = 100
  const ground = MeshBuilder.CreateBox('ground', {
    width: arenaSize, 
    depth: arenaSize,
    height: 1,
    subdivisions: 10,
  }, scene)
  ground.position.y = -2
  // const grassTexture = new GrassProceduralTexture('grassTexture', arenaSize*arenaSize, scene) // seems super slow?
  const grassTexture = new Texture('/textures/grass.jpg', scene)
  // repeats the texture...but not sure on details
  grassTexture.uScale = 30
  grassTexture.vScale = 30
  const grassMaterial = new StandardMaterial('grassMaterial', scene)
  grassMaterial.ambientTexture = grassTexture 
  ground.material = grassMaterial
  // ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5, restitution: 0 }, scene)
}

function addCharacterCamera(character) {
  // // follow cam
  const camera = new FollowCamera('camera', new Vector3(1, -2, 0), scene)
  camera.lockedTarget = character
  camera.cameraAcceleration = .03 // how quickly to accelerate to the "goal" position
  camera.maxCameraSpeed = 10 // speed at which acceleration is halted
  camera.rotationOffset = 180 // not sure why in degress...oh well
  camera.position = new Vector3(0,0,-10)
  camera.heightOffset = 5
  camera.radius = 30

  // camera.attachControl(canvas, true)
  return camera

}
