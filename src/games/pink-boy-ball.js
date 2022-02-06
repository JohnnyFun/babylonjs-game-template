/*
TODO:
- fix controls/camera rotation...
- reset pink boy when he falls over? ideally animate him falling and slowly getting up, but wait til you've thought about what you want the game to be.
- bring the fountain in
*/

import { ActionManager, AmmoJSPlugin, ArcRotateCamera, Axis, ExecuteCodeAction, FollowCamera, HemisphericLight, MeshBuilder, PhysicsImpostor, Scene, SceneLoader, StandardMaterial, Texture, TransformNode, Vector3 } from '@babylonjs/core'

import Ammo from 'ammo.js'

let scene
let character
let camera
let inputMap = {}
let canvas

export default async function create(_engine, _canvas) {
  canvas = _canvas
  scene = new Scene(_engine)
  await addPhysics()
  addLight()
  addCourse()
  addInputTracking()
  await addCharacter()
  addCamera(false)
  addGround()
  addBall()
  return scene
}

function addInputTracking() {
  scene.actionManager = new ActionManager(scene)
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, e => inputMap[e.sourceEvent.key] = true))
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, e => inputMap[e.sourceEvent.key] = false))
}

function addLight() {
  new HemisphericLight('light', new Vector3(0, 1, 0), scene)
}

function addBall() {
  const ball = MeshBuilder.CreateSphere('ball', { diameter: 2 }, scene)
  const ballImposter = new PhysicsImpostor(ball, PhysicsImpostor.BoxImpostor, {
    mass: .1,
    restitution: .9,
    friction: 0.1,
  })
  ball.position.y = 10
}

async function addPhysics() {
  const ammo = await Ammo()
  scene.enablePhysics(new Vector3(0,-9.81,0), new AmmoJSPlugin(true, ammo))
}

function addGround() {
  const arenaSize = 100
  const ground = MeshBuilder.CreateBox('ground', {
    width: arenaSize, 
    depth: arenaSize,
    height: 1,
    subdivisions: 10,
  }, scene)
  ground.position.y = -1
  // const grassTexture = new GrassProceduralTexture('grassTexture', arenaSize*arenaSize, scene) // seems super slow?
  const grassTexture = new Texture('/textures/grass.jpg', scene)
  // repeats the texture...but not sure on details
  grassTexture.uScale = 30
  grassTexture.vScale = 30
  const grassMaterial = new StandardMaterial('grassMaterial', scene)
  grassMaterial.ambientTexture = grassTexture 
  ground.material = grassMaterial
  ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5, restitution: .9 }, scene)
}

async function addCharacter() {
  character = new MeshBuilder.CreateBox('character', { height: 4, width: 1, depth: 1 }, scene)
  character.visibility = 0 // .5 // for debugging, so can see what the physics imposter is actually using to do physics on.
  const result = await SceneLoader.ImportMeshAsync('', '/scenes/pinkboy/', 'pinkboy.glb', scene)
  const pinkBoy = result.meshes[0]
  pinkBoy.parent = character
  pinkBoy.position.y = -2

  character.name = 'pinkboy'
  const characterImposter = new PhysicsImpostor(character, PhysicsImpostor.BoxImpostor, { mass: 1, friction: 0.5, restitution: 0 }, scene)
  const characterSpeed = .2
  const characterRotationSpeed = .05
  character.position.z = -45
  character.position.y = 10
  const idle = scene.getAnimationGroupByName('Idle')
  const run = scene.getAnimationGroupByName('Run')
  let animating = false
  scene.onBeforeRenderObservable.add(() => {
    animating = false
    if (inputMap['w']) {
      character.moveWithCollisions(character.forward.scaleInPlace(characterSpeed))
      run?.start(true, 1, run.from, run.to, false)
      animating = true
    }
    if (inputMap['s']) {
      character.rotate(Axis.Y, -characterRotationSpeed) // todo: turn around animation instead
      animating = true
    }
    if (inputMap['a']) {
      character.rotate(Axis.Y, -characterRotationSpeed)
      animating = true
    }
    if (inputMap['d']) {
      character.rotate(Axis.Y, characterRotationSpeed)
      animating = true
    }

    // if (Math.abs(character.rotation.y) > Math.PI/2){
    //   character.rotation = new Vector3(0, 0, 0)
    // }

    if (!animating) {
      run?.stop()
      idle?.start(true, 1, idle.from, idle.to, false)
    }
  })
}

function addDebugCamera() {
  camera = new ArcRotateCamera('camera', Math.PI/2, Math.PI/2.5, 130, new Vector3(0,2,0), scene)
  camera.attachControl(canvas, true)
}

function addCamera(debug = false) {
  if (debug) return addDebugCamera()
  camera = new FollowCamera('camera', new Vector3(0, 2, 0), scene)
  camera.rotationOffset = 180
  camera.lockedTarget = character
  camera.cameraAcceleration = .03 // how quickly to accelerate to the "goal" position
  camera.maxCameraSpeed = 10 // speed at which acceleration is halted
}

function addCourse() {
  const course = new TransformNode('course', scene)
  const rampMaterial = new StandardMaterial('rampMaterial', scene)
  rampMaterial.ambientTexture = new Texture('/textures/danger-ramp.png', scene)
  const ramp = MeshBuilder.CreateBox('ramp', {
    height: 10,
    width: 5,
    depth: 1,
  })
  ramp.rotation.x = Math.PI / 2.3
  ramp.physicsImpostor = new PhysicsImpostor(ramp, PhysicsImpostor.BoxImpostor, {
    mass: 0,
  }, scene)
  ramp.parent = course
  ramp.material = rampMaterial
  course.position.z = 0
}