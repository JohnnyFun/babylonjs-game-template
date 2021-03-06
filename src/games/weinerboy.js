// TODO: make a softbody cube the character. see if it jiggles when you move it
// TODO: first, set up simple cylinder weiner with softbody animation when you move him around
// TODO: then, make a weiner in blender and use that instead
// TODO: make a few obstacles (implement gravity so it can fall off stuff and jiggle around)
// TODO: make cube on the map to reach
// TODO: as you get closer to the cube, make soft body stiffer
// TODO: add sound effects. as gets stiffer, grunt disgustingly. when arrive, orgasmic

import { ActionManager, AmmoJSPlugin, ArcRotateCamera, Axis, Color3, ExecuteCodeAction, FollowCamera, HemisphericLight, Mesh, MeshBuilder, PhysicsImpostor, PhysicsJoint, Scene, StandardMaterial, Texture, TransformNode, Vector3 } from '@babylonjs/core'

import Ammo from 'ammo.js'

let scene
let inputMap = {}
let showImposters = false
const imposterVisibility = showImposters ? .8 : undefined

export default async function create(engine, canvas) {
  scene = new Scene(engine)
  const camera = new ArcRotateCamera('camera', 4.381, 1.039, 29, new Vector3(), scene)
  camera.attachControl(canvas, true)
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene)
  await addPhysics()
  addInputTracking()
  addGround()
  addBoxes()
  const character = addWeiner()
  // const character = addSnake()
  addCharacterControls(character)
  addCharacterCamera(character)
  addCourse()
  return scene
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
  ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5, restitution: 0 }, scene)
}

function addBoxes() {
  const boxes = new TransformNode('boxes', scene)
  const logWallMaterial = new StandardMaterial('logWallMaterial', scene)
  logWallMaterial.ambientTexture = new Texture('/textures/logwall.jpg', scene)
  let row = 0
  let col = 0
  for (let i = 0; i < 80; i++) {
    const box = MeshBuilder.CreateBox('box', {}, scene)
    if (i % 10 === 0) {
      col = 0
      row++
    }
    col++
    box.position.x = col - 5
    box.position.y = row
    box.position.z = 20
    box.physicsImpostor = new PhysicsImpostor(box, PhysicsImpostor.BoxImpostor, {
      mass: .2,
      friction: 10,
    })
    box.material = logWallMaterial
    box.parent = boxes
  }
}

function addSnake() {
  const linkCount = 10
  const headMass = 2
  const friction = 1
  const head = MeshBuilder.CreateBox('head', {
    size: 2
  }, scene)
  head.physicsImpostor = new PhysicsImpostor(head, PhysicsImpostor.BoxImpostor, {
    mass: headMass,
    friction,
  }, scene)
  let links = [head]
  for (let i = 0; i < linkCount ; i++) {
    const link = MeshBuilder.CreateBox('link', {}, scene)
    link.physicsImpostor = new PhysicsImpostor(link, PhysicsImpostor.BoxImpostor, {
      mass: headMass*.01,
      friction: 1,
    }, scene)
    link.position.z = -1.6*(i+1)
    const joint = new PhysicsJoint(PhysicsJoint.BallAndSocketJoint, {
      mainPivot: new Vector3(0,0,0),
      connectedPivot: new Vector3(0, 0, -1.6)
    })
    const prevLink = links[i]
    prevLink.physicsImpostor.addJoint(link.physicsImpostor, joint)
    links.push(link)
  }
  return head
}

function addWeiner() {
   // weiner imposter 
   const weinerImposter = MeshBuilder.CreateBox('weinerImposter', {
    width: 2,
    height: 3,
    depth: 1.5,
  })
  new PhysicsImpostor(weinerImposter, PhysicsImpostor.BoxImpostor, {
    mass: 20,
  })

  // we're controlling the imposter--the model/complex mesh is just along for the ride
  weinerImposter.visibility = imposterVisibility

  // make the weiner model
  const skinMaterial = new StandardMaterial('skin', scene)
  skinMaterial.diffuseColor = new Color3(238/255,181/255,130/255)
  const length = 2
  const shaft = MeshBuilder.CreateCylinder('shaft', {
    height: length,
    diameterBottom: 1.2,
    diameterTop: .9,
  }, scene)
  shaft.position.y = length/2
  shaft.material = skinMaterial
  // weiner.parent = weiner
  const leftTesticle = MeshBuilder.CreateSphere('leftTesticle', {

  }, scene)
  leftTesticle.position.x = -.4
  leftTesticle.position.y = -length/2 + .1
  leftTesticle.position.z = -.3
  leftTesticle.material = skinMaterial
  leftTesticle.parent = shaft

  const rightTesticle = MeshBuilder.CreateSphere('rightTesticle', {
  }, scene)
  rightTesticle.position.x = .4
  rightTesticle.position.y = -length/2 + .1
  rightTesticle.position.z = -.3
  rightTesticle.material = skinMaterial
  rightTesticle.parent = shaft
  
  const tip = MeshBuilder.CreateSphere('tip', {
    diameter: 1.1
  }, scene)
  tip.position.y = length/2 - .1
  tip.material = skinMaterial
  tip.parent = shaft

  const weinerModel = Mesh.MergeMeshes([
    shaft,
    ...shaft.getChildMeshes()
  ])
  weinerModel.name = 'weinerModel'
  weinerModel.parent = weinerImposter
  weinerModel.position = new Vector3(0, -1.2, .1)

  // // cloth
  // var plane = MeshBuilder.CreateGround("plane", {width: 15, height: 12, subdivisions: 25 }, scene);
  // plane.position.y = 8;
  // plane.physicsImpostor =  new PhysicsImpostor(plane, PhysicsImpostor.ClothImpostor, { mass: 1, friction: 0.1, restitution: 0, margin: 0.35}, scene);
  // plane.physicsImpostor.pressure =  60;
  // plane.physicsImpostor.velocityIterations = 10; 
  // plane.physicsImpostor.positionIterations = 10;
  // plane.physicsImpostor.stiffness = 1;

  
  // weiner.position.y = 10
  // weiner.forceSharedVertices() // so the weiner doesn't get pulled apart
  // weiner.increaseVertices(5) // TODO: test...
  // TODO: why can't my complex mesh be a soft body? you need a compound imposter like in this tutorial: https://playground.babylonjs.com/#492ZK0#145
  //       related: MeshImposter works, but drastically slower. And not softbody.
  // weiner.physicsImpostor = new PhysicsImpostor(weiner, PhysicsImpostor.MeshImpostor, {
  //   mass: 15,
  //   friction: 0.2,
  //   restitution: 0.3,
  //   pressure: 3500,
  //   velocityIterations: 10, 
  //   positionIterations: 10,
  //   stiffness: 1,
  //   damping: 0.05
  // }, scene)

  return weinerImposter
}

function addCharacterControls(character) {
  const characterSpeed = .2
  const characterRotationSpeed = .05
  let animating = false
  scene.onBeforeRenderObservable.add(() => {
    animating = false
    if (inputMap['w']) {
      // character.physicsImpostor.applyForce(new Vector3(0, 10, 0), new Vector3(0,0,0))
      // character.applyImpulse(new Vector3(0, 10, 0), new Vector3(0,0,0))
      character.moveWithCollisions(character.forward.scaleInPlace(characterSpeed))
      // run.start(true, 1, run.from, run.to, false)
      animating = true
    }
    if (inputMap['s']) {
      character.moveWithCollisions(character.forward.scaleInPlace(-characterSpeed/2))
      // character.rotate(Axis.Y, -characterRotationSpeed) // TODO: handle better...
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

    if (!animating) {
      // run.stop()
      // idle.start(true, 1, idle.from, idle.to, false)
    }
  })
}

function addCharacterCamera(character) {
  // // follow cam
  const cameraDist = 13
  const camera = new FollowCamera('camera', new Vector3(0, -2, 0), scene)
  camera.lockedTarget = character

  // camera.lowerAlphaLimit = 
  // camera.upperAlphaLimit
  // camera.lowerBetaLimit = 
  // camera.upperBetaLimit
  // camera.lowerRadiusLimit = 2
  // camera.upperRadiusLimit = cameraDist
  // camera.wheelDeltaPercentage = 0.01

  // camera.heightOffset = 3
  // camera.rotationOffset = 0
  camera.cameraAcceleration = .03 // how quickly to accelerate to the "goal" position
  camera.maxCameraSpeed = 10 // speed at which acceleration is halted
  camera.rotationOffset = 180
}

function addInputTracking() {
  scene.actionManager = new ActionManager(scene)
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, e => inputMap[e.sourceEvent.key] = true))
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, e => inputMap[e.sourceEvent.key] = false))
}

function addCourse() {
  const course = new TransformNode('course', scene)
  const rampMaterial = new StandardMaterial('rampMaterial', scene)
  rampMaterial.ambientTexture = new Texture('/textures/dickjumpramp.png', scene)
  const ramp = MeshBuilder.CreateBox('ramp', {
    height: 10,
    width: 5,
    depth: 1,
  })
  ramp.rotation.x = Math.PI / 2.3
  ramp.physicsImpostor = new PhysicsImpostor(ramp, PhysicsImpostor.BoxImpostor, {
    mass: 0
  }, scene)
  ramp.parent = course
  ramp.material = rampMaterial
  course.position.z = 10
}