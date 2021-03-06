import '@babylonjs/loaders/glTF'

import { Axis, Matrix, Quaternion, Space, Vector3 } from '@babylonjs/core/Maths/math'

import { ActionManager } from '@babylonjs/core/Actions/actionManager'
import {Engine} from '@babylonjs/core/Engines/engine'
import { ExecuteCodeAction } from '@babylonjs/core/Actions'
import {FollowCamera} from '@babylonjs/core/Cameras/followCamera'
import {GrassProceduralTexture} from '@babylonjs/procedural-textures/grass/grassProceduralTexture'
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight'
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder'
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents'
import { Scene } from '@babylonjs/core/scene'
import {SceneLoader} from '@babylonjs/core'
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial'

const msg = document.getElementById('status-msg')
const canvas = document.getElementById('renderCanvas')
const engine = new Engine(canvas)
window.addEventListener('resize', e => engine.resize())
let scene = new Scene(engine)

let keys = {}
scene.actionManager = new ActionManager(scene)
scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, e => {
  keys[e.sourceEvent.key] = true
  if (e.sourceEvent.key === 'r') reset()
}))
scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, e => keys[e.sourceEvent.key] = false))

let light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene)
light.intensity = .5

let wall = MeshBuilder.CreateBox('wall', {
  width: 5,
  height: 6,
  depth: 1
})
wall.position.set(1,3,-3)
wall.checkCollisions = true


const arenaSize = 50
let grassMaterial = new StandardMaterial('grassMaterial', scene)
let grassTexture = new GrassProceduralTexture('grassTexture', arenaSize*arenaSize, scene)
grassMaterial.ambientTexture = grassTexture
let ground = MeshBuilder.CreateGround('ground', {
  height: arenaSize,
  width: arenaSize
}, scene)
ground.material = grassMaterial

const characterSize = 2
const characterSpeed = .2
const characterRotationSpeed = Math.PI / 100
let move = new Vector3()

buildGame()

async function buildGame() {
  // let character = MeshBuilder.CreateBox('character', {
  //   size: characterSize,
  // }, scene)
  let character = await addLittleFella()
  character.position.y = characterSize/2
  character.rotationQuaternion = new Quaternion()

  window.character = character
  
  let camera = new FollowCamera('camera', new Vector3(0,0,0), scene, character)
  camera.attachControl(document.body)
  
  reset()
  engine.runRenderLoop(() => {
    // const deltaTime = scene.getEngine().getDeltaTime()/1000
    moveCharacter()
    scene.render()
  })

  
function moveCharacter() {
  let moved = false
  let turned = false
  if (keys['w']) {
    move.z = -characterSpeed
    moved = true
  }
  if (keys['s']) {
    move.z = characterSpeed
    moved = true
  }
  if (keys['d']) {
    turned = true
    character.rotationQuaternion.multiplyInPlace(Quaternion.RotationAxis(new Vector3(0,1,0), characterRotationSpeed))
  }
  if (keys['a']) {
    turned = true
    character.rotationQuaternion.multiplyInPlace(Quaternion.RotationAxis(new Vector3(0,1,0), -characterRotationSpeed))
  }
  
  if (moved) {
    let mat = new Matrix()
    character.rotationQuaternion.toRotationMatrix(mat)
    character.position.addInPlace(Vector3.TransformCoordinates(move, mat))
  }

  // TODO: if you press walk AND turn then stop one or the other, wrong animation speed remains...
  if (moved) walking()
  else if (turned) turning()
  else stopWalking()
}

function walking() {
  scene.getAnimationGroupByName('RunCycle').start(true, 1, 0, .6)
}

function turning() {
  scene.getAnimationGroupByName('RunCycle').start(true, .4, 0, .6)
}

function stopWalking() {
  scene.getAnimationGroupByName('RunCycle').stop()
  scene.getAnimationGroupByName('Idle').start(true)
}

function reset() {
  clearStatus()
}

function clearStatus() {
  msg.style.display = 'none'
}


async function addLittleFella() {
  const { meshes, particleSystems, skeletons, animationGroups } = await SceneLoader.ImportMeshAsync('', resolve('scenes/'), 'little-fella.glb', scene)
  // console.log(meshes, particleSystems, skeletons, animationGroups)
  scene.getAnimationGroupByName('Idle').stop() // fucked up idle animation...
  let fella = scene.getMeshByName('Fella').parent.parent
  
  let fellaImposter = MeshBuilder.CreateBox('fellaImposter', {
    width: 2.5,
    height: 6.5,
    depth: 2.5
  })
  let transparentMaterial = new StandardMaterial('transparent', scene)
  transparentMaterial.alpha = 0
  fellaImposter.material = transparentMaterial
  // fellaImposter.physicsImpostor = new PhysicsImpostor(fellaImposter, PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5 }, scene)
  fella.parent = fellaImposter
  fellaImposter.checkCollisions = true
  fellaImposter.position.y = .6

  fella.rotate(Axis.Y, Math.PI/2, Space.LOCAL) // model was built on different axis, so rotate 90

  // let turnaround = false
  // let goingLeft = false
  // scene.onBeforeRenderObservable.add(() => {
  //   turnaround = Math.abs(fellaImposter.position.x) > 5
  //   if (turnaround) {
  //     goingLeft = !goingLeft
  //     fellaImposter.rotate(Axis.Y, Math.PI, Space.WORLD)
  //   }
  //   fellaImposter.position.x += goingLeft ? -.1 : .1
  // })
  return fellaImposter
}

function resolve(relative) {
  const path = window.location.pathname.replace(/[^\.\/]+\.html/, '').trim()
  if (path === '' || path === '/') return relative
  return `${path}/${relative}`.replace(/\/\//, '/')
}

}