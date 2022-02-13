// TODO: 
/*
- Names
  - War beach party
  - Make beach balls, not war
- ai tanks that you can shoot
  - if hit, disconnect parts, give them all physics imposters, and set their linear velocity slightly offset randomly from ground.up!
- win
  - once all other tanks are broken
- if you flip, you die
  - key off of tank body rotation and velocity--wait for it to be between some upside down threshold _and_ not moving--if they roll all the way over somehow, that's fine
- ai tanks should try to shoot you
  - basic path finding and turret control to gradually try to get you
- limited ammo
  - have to pick up ammo boxes that contain 1 ammo (label it with the bullet texture)--occassionally give an easter egg ammo box!
- github repo that gives Jane PR ability, but not access to master
  - give Jane/Tim/Josh access to submit PRs, although I think PR is open to anyone on github, so yay
  
- lower priority ideas:
  - tank turret and barrel should have physicsImposter too so when it rolls over it doesn't just fall to the ground...
  - jane requests:
    - balls should get bigger when they come out of the barrel (start them tiny and animate growth)
    - every 2-15 shots, shoot random object
      - a _literal_ easter egg
        - ellipsoid with easter egg texture should do it
    - make tank a fuzzy cheeto texture (learn how to make fur/hair 3 dimensional)
    - something should leave behind a trail
      - perhaps giant snails...their purpose could be nothing or maybe a wall to block beach balls lol
      - or perhaps the tanks could leave behind a rainbow trail that gradually disappears
    - confetti explosion on impact
      - use particle system probably with lots of velocity
  - sounds effect when shooting and plopping down (BOOM! or like lip pop/lolipop pop)
  - add levels
   - just add more tanks, different courses. But to start, just have one course and like a few tanks
  - randomly generate course, given parameters like { numRamps, numTankEnemies, numBlockades }
  - add some terrain features--hills to drive up and down, roll over on--apply physics to them somehow...
  - use applyImpulse to drive tank instead, so it slows down going up hills/ramps and rolls over more realistically
  - when tank gets hit, bust it up into 3 pieces (disconnect it, then apply impulse to all its parts with random vectors)
  - bullet should dispose if it gets too far down the y axis...rather than making it disappear after some misc time
  - organize code better into classes. put into separate git repo like dirt ball

- bugs
  - camera rotation offset gets wonked up if tank rotates
    - seems it happens if the tank rotates from the physics engine, so this might go away if you use the physics engine to control it too
      - but not sure if that's what makes sense to do. so maybe get it fixed before doing that and feel it out...
*/

// earlier notes:
// make controls work in and outside of VR? keyboard equivalents
// would have to have camera snap to top of tank no matter where they walk or rotate to--force them to control the tank/turret like a tank commander (allow them to turn their head though--just don't allow them to walk away from their JOB!)
// don't add physics til have basic controls in place and working outside of VR (want to see if I can keep it efficent as possible...)
// make simple tank turret
// put user on top of tank
// left joy stick turns turret
// right 

// OR
// make it a mounted machine gun that you grab with hands
// TODO: how to "grab" a mesh--when hand is within some distance to a mesh and the inside trigger is squeezed, attach the mesh by that point to the controller mesh! 
// THEN, when you move your hand the gun should move accordingly! BUt you'd also need the gun attached to the turret...

import { ActionManager, AmmoJSPlugin, Animation, Axis, Color3, ExecuteCodeAction, FollowCamera, HemisphericLight, MeshBuilder, PhysicsImpostor, Scene, Sprite, SpriteManager, StandardMaterial, Texture, Tools, TransformNode, Vector3 } from '@babylonjs/core'

import Ammo from 'ammo.js'

const arenaSize = 500
let canvas
let scene
let inputMap = {}
let bullets
let tanks = {}
let ground
let tankMaterial
let deadTankMaterial
const barrelTipDiameter = .6

export default async function create(engine, _canvas) {
  canvas = _canvas
  scene = new Scene(engine)
  addTankMaterials()
  new HemisphericLight('light', new Vector3(0, 1, 0), scene)
  bullets = new TransformNode('bullets', scene)
  await addPhysics()
  addInputTracking()
  addGround()
  addTrees()
  addCourse()
  const myTank = addTank('myTank')
  addCameraAndControlsForMyTank(myTank)
  addAiTanks()
  return scene
}

function addTankMaterials() {
  tankMaterial = new StandardMaterial('tankMaterial', scene)
  const tankBumpTexture = new Texture('/textures/logwall.jpg', scene)
  tankMaterial.bumpTexture = tankBumpTexture
  tankMaterial.diffuseColor = Color3.FromHexString('#264514')

  deadTankMaterial = new StandardMaterial('deadTankMaterial', scene)
  const deadTankBumpTexture = new Texture('/textures/cheeto-fur.jpg', scene)
  deadTankMaterial.bumpTexture = deadTankBumpTexture
  deadTankMaterial.diffuseColor = Color3.FromHexString('#990000')
}

function addCameraAndControlsForMyTank(myTank) {
  const camera = addCharacterCamera(myTank.turret)
  addTankControls(myTank.body, camera)
  addTurretControls(myTank.turret)
  addBarrelControls(myTank.barrel)
}

async function addPhysics() {
  const ammo = await Ammo()
  scene.enablePhysics(new Vector3(0,-9.81,0), new AmmoJSPlugin(true, ammo))
}

function addTank(name) {
  const body = MeshBuilder.CreateBox(name, {
    height: 2,
    width: 6,
    depth: 10,
  }, scene)
  body.material = tankMaterial
  body.physicsImpostor = new PhysicsImpostor(body, PhysicsImpostor.BoxImpostor, { mass: 100, friction: .9, restitution: 1 }, scene)
  const turret = MeshBuilder.CreateBox(`${name}Turret`, {
    height: 1.3,
    width: 5,
    depth: 6,
  }, scene)
  // turret.physicsImpostor = new PhysicsImpostor(turret, PhysicsImpostor.BoxImpostor, { mass: 0, friction: .9, restitution: 0 }, scene)
  turret.position.y = 2
  turret.material = tankMaterial
  // turret.rotation.y = Math.PI / 4
  turret.parent = body

  const barrel = MeshBuilder.CreateCylinder(`${name}Barrel`, {
    diameterBottom: .9,
    diameterTop: barrelTipDiameter,
    height: 7,
  })
  // barrel.physicsImpostor = new PhysicsImpostor(barrel, PhysicsImpostor.CylinderImpostor, { mass: 0, friction: .9, restitution: 0 }, scene)
  barrel.setPivotPoint(new Vector3(0, -3.5, 0)) // rotate from base of barrel
  barrel.position.y = 3.5
  barrel.position.z = 2.8
  barrel.rotation.x = Math.PI / 2.3
  barrel.material = tankMaterial
  barrel.parent = turret

  const tank = { body, turret, barrel, isDead: false }
  tanks[name] = tank
  return tank
}

function addInputTracking() {
  scene.actionManager = new ActionManager(scene)
  // toLowerCase so that 'a' and 'A' are the same and so that if you release shift, you don't have the capital version of th letter still marked as pressed...
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, e => inputMap[e.sourceEvent.key.toLowerCase()] = true))
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, e => inputMap[e.sourceEvent.key.toLowerCase()] = false))
}

function addTankControls(tankBody, camera) {
  // we change camera's rotationOffset, so it is always directly behind turret, even if the tank body turns
  const tankSpeed = .2
  const tankRotationSpeed = .03
  scene.onBeforeRenderObservable.add(() => {
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
  const turretRotationSpeed = .003 // same as body, so can stay on target as it turns
  scene.onBeforeRenderObservable.add(() => {
    if (inputMap['arrowleft']) turret.rotate(Axis.Y, -fasterIfHoldingShift(turretRotationSpeed))
    if (inputMap['arrowright']) turret.rotate(Axis.Y, fasterIfHoldingShift(turretRotationSpeed))
  })
}

function fasterIfHoldingShift(turretRotationSpeed) {
  return inputMap['shift'] ? turretRotationSpeed * 8 : turretRotationSpeed
}

function addBarrelControls(barrel) {
  const barrelRotationSpeed = .005
  const maxBarrelDownward = Tools.ToRadians(89.1)
  const maxBarrelUpward = Tools.ToRadians(58)
  let shooting = false
  let bulletsPerSecond = 2
  scene.onBeforeRenderObservable.add(() => {
    if (inputMap['arrowup']) barrel.addRotation(-barrelRotationSpeed, 0, 0)
    if (inputMap['arrowdown']) barrel.addRotation(barrelRotationSpeed, 0, 0)
    if (barrel.rotation.x < maxBarrelUpward) barrel.rotation.x = maxBarrelUpward
    if (barrel.rotation.x > maxBarrelDownward) barrel.rotation.x = maxBarrelDownward
    if (inputMap[' '] && !shooting) {
      shooting = true
      shootBullet(barrel)
      setTimeout(() => shooting = false, 1000 / bulletsPerSecond)
    }
  })
}

function shootBullet(barrel) {
  const bulletDiameterFinal = 5
  const bullet = MeshBuilder.CreateSphere('bullet', {diameter: bulletDiameterFinal/*barrelTipDiameter*/}, scene)
  bullet.parent = barrel
  // bullet.visibility = .5
  bullet.position.y += 3.5 + bulletDiameterFinal/*barrelTipDiameter*//2 // position bullet at tip of barrel
  
  // const frameRate = 30
  // const growAnimation = new Animation('grow', 'scaling', frameRate, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT)
  // growAnimation.setKeys([
  //   {
  //     frame: 0,
  //     value: new Vector3(0, 0, 0),
  //   },
  //   {
  //     frame: frameRate,
  //     value: new Vector3(bulletDiameterFinal, bulletDiameterFinal, bulletDiameterFinal),
  //   },
  // ])
  // bullet.animations = [growAnimation]
  // scene.beginAnimation(bullet, 0, frameRate, true)

  const beachBallMaterial = new StandardMaterial('beachBallMaterial', scene)
  const beachBallTexture = new Texture('/textures/beachball.png', scene)
  beachBallMaterial.diffuseTexture = beachBallTexture
  bullet.material = beachBallMaterial
  bullet.setParent(null) // now that it's positioned, unset it as child and send it off...
  bullet.physicsImpostor = new PhysicsImpostor(bullet, PhysicsImpostor.SphereImpostor, { mass: 10, restitution: .9 }, scene)
  bullet.physicsImpostor.setLinearVelocity(bullet.up.scale(30)) // bullet.up is directly up the barrel in local space, regardless of it's world rotation!!
  bullet.parent = bullets

  // when bullet collides with a tank, it should explode
  bullet.physicsImpostor.registerOnPhysicsCollide(Object.keys(tanks).map(name => tanks[name].body.physicsImpostor), (collider, collidedWith) => {
    setTimeout(() => collider.object.dispose(), 500) // wait a bit before removing bullet, so it can bounce off tank
    // could use the bullet's angular velocity to influence the direction the tank explodes toward, but this is good enough for now
    blowUpTank(tanks[collidedWith.object.name])
  })

  // setTimeout(() => bullet.dispose(), 30000) // instead wait til it's been stopped for a while or is below some y coord _and_ it's not already disposed/null
}

function blowUpTank(tank) {
  tank.isDead = true

  tank.body.material = deadTankMaterial
  tank.turret.material = deadTankMaterial
  tank.barrel.material = deadTankMaterial

  // tank.barrel.position = tank.barrel.getAbsolutePosition()
  // tank.turret.position = tank.turret.getAbsolutePosition()
  
  // tank.barrel.parent = null
  // tank.turret.parent = null

  tank.body.physicsImpostor.setLinearVelocity(new Vector3(0, 12, 9))
  tank.body.physicsImpostor.setAngularVelocity(new Vector3(2, 9, 8))

  // tank.turret.physicsImpostor = new PhysicsImpostor(tank.turret, PhysicsImpostor.BoxImpostor, { mass: 0, friction: .9, restitution: 0 }, scene)
  // tank.barrel.physicsImpostor = new PhysicsImpostor(tank.barrel, PhysicsImpostor.CylinderImpostor, { mass: 0, friction: .9, restitution: 0 }, scene)
}

function addCourse() {
  const course = new TransformNode('course', scene)

  const wallMaterial = new StandardMaterial('wallMaterial', scene)
  const wallTexture = new Texture('/textures/danger-ramp.png', scene)
  wallMaterial.diffuseTexture = wallTexture

  const blockade = MeshBuilder.CreateBox('blockade', { width: 10, height: .5, depth: 10 }, scene)
  blockade.position.z = -20
  blockade.position.x = 30
  blockade.rotation.y = Math.PI / 3
  blockade.rotation.x = -Math.PI / 2.3
  blockade.physicsImpostor = new PhysicsImpostor(blockade, PhysicsImpostor.BoxImpostor, { mass: 0, friction: .9, restitution: 0 }, scene)
  blockade.parent = course
  blockade.material = wallMaterial

  
  const ramp = MeshBuilder.CreateBox('ramp', { width: 10, height: .5, depth: 10 }, scene)
  ramp.position.z = 30
  ramp.position.x = 0
  ramp.position.y = .5
  ramp.rotation.y = Math.PI/2
  ramp.rotation.z = -Math.PI / 6
  ramp.physicsImpostor = new PhysicsImpostor(ramp, PhysicsImpostor.BoxImpostor, { mass: 0, friction: .9, restitution: 0 }, scene)
  ramp.parent = course
  ramp.material = wallMaterial

  const ramp2 = MeshBuilder.CreateBox('ramp2', { width: 10, height: .5, depth: 10 }, scene)
  ramp2.position.z = 40
  ramp2.position.x = 0
  ramp2.position.y = .5
  ramp2.rotation.y = -Math.PI/2
  ramp2.rotation.z = -Math.PI / 6
  ramp2.physicsImpostor = new PhysicsImpostor(ramp2, PhysicsImpostor.BoxImpostor, { mass: 0, friction: .9, restitution: 0 }, scene)
  ramp2.parent = course
  ramp2.material = wallMaterial

}

function addGround() {
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

  ground = MeshBuilder.CreateBox('ground', {
    width: arenaSize,
    depth: arenaSize,
    height: 1,
    subdivisions: 10,
  }, scene)
  ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5, restitution: 0 }, scene)
  ground.position.y = -2
  // const grassTexture = new GrassProceduralTexture('grassTexture', arenaSize*arenaSize, scene) // seems super slow?
  const grassTexture = new Texture('/textures/sand.jpg', scene)
  // repeats the texture...but not sure on details
  grassTexture.uScale = 30
  grassTexture.vScale = 30
  const grassMaterial = new StandardMaterial('grassMaterial', scene)
  grassMaterial.ambientTexture = grassTexture 
  ground.material = grassMaterial
}

function addCharacterCamera(character) {
  const camera = new FollowCamera('camera', new Vector3(1, -2, 0), scene)
  camera.lockedTarget = character
  camera.cameraAcceleration = .03 // how quickly to accelerate to the "goal" position
  camera.maxCameraSpeed = 10 // speed at which acceleration is halted
  camera.rotationOffset = 180 // not sure why in degress, but ok
  camera.position = new Vector3(0,0,-10)
  camera.heightOffset = 5
  camera.radius = 30
  return camera

}


function addTrees() {
  const totalTrees = 100
  const treeSpriteManager = new SpriteManager('treeSpriteManager', '/textures/palmTree.png', totalTrees, {width:600, height:1000}, scene)
  // place trees in the arena spread out (github copilot did this...very cool)
  for (let i = 0; i < totalTrees; i++) {
    const tree = new Sprite('tree' + i, treeSpriteManager)
    tree.position = new Vector3(
      Math.random() * arenaSize - arenaSize / 2,
      5,
      Math.random() * arenaSize - arenaSize / 2
    )
    tree.size = .5
    tree.height = 15
    tree.width = 9
    tree.isPickable = false
  }
}

function addAiTanks() {
  const totalTanks = 10
  const aiTanks = new TransformNode('aiTanks', scene)
  for (let i = 0; i < totalTanks; i++) {
    const tank = addTank('tank' + i, scene)
    tank.body.position = new Vector3(
      Math.random() * arenaSize - arenaSize / 2,
      5,
      Math.random() * arenaSize - arenaSize / 2
    )
    tank.body.rotate(Axis.Y, 59 + i*30)
    tank.body.parent = aiTanks
    // setTimeout(() => blowUpTank(tank), 3000) // to test explosion animation...
  }
}