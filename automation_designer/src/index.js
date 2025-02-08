import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

let camera, scene, renderer, controls, transformControls;
let plane, raycaster, pointer;
let isShiftDown = false, isCtrlDown = false, isAltDown = false;
let objects = [], walls = [];
let selectedObject = null;

const models = {};
let currentModelKey = 'arm';

const loadingScreen = document.getElementById('loading-screen');
const loadingMessage = document.getElementById('loading-message');
let roomWidth = 1500, roomDepth = 1500, roomHeight = 400;
let widthSlider = document.getElementById('roomWidth');
let depthSlider = document.getElementById('roomDepth');
let heightSlider = document.getElementById('roomHeight');
let widthValue = document.getElementById('widthValue');
let depthValue = document.getElementById('depthValue');
let heightValue = document.getElementById('heightValue');

const modelCosts = {
    arm: 15000,
    arm_kurze_schiene: 20000,
    arm_lange_schiene: 25000,
    förderband: 8000,
    förderband_hoch: 35000,
    trager: 30000,
    multiarm: 45000,
    palletierer: 30000,
    pallette: 80
};

const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = function () {
    console.log("All assets loaded!");
    renderer.compile(scene, camera);
    fadeOutLoadingScreen();
    onAssetsLoaded();
};

init();
loadModels();

function init() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(700, 900, 1000);
    camera.lookAt(0, 0, 0);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    const textureLoader = new THREE.TextureLoader();

    // SkyDome
    const skyTexture = textureLoader.load('/img/sky_texture.jpg');
    const skyGeometry = new THREE.SphereGeometry(2000, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
        map: skyTexture,
        side: THREE.BackSide // Texture visible from inside
    });
    const skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skyDome);

    // Floor with repeating texture
    const floorTexture = textureLoader.load('/img/floor.jpg');
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
    const floorGeometry = new THREE.PlaneGeometry(4000, 4000);
    floorGeometry.rotateX(-Math.PI / 2);
    plane = new THREE.Mesh(floorGeometry, floorMaterial);
    plane.receiveShadow = true;
    scene.add(plane);
    objects.push(plane);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(300, 1000, 500);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 5000;
    dirLight.shadow.camera.left = -2000;
    dirLight.shadow.camera.right = 2000;
    dirLight.shadow.camera.top = 2000;
    dirLight.shadow.camera.bottom = -2000;
    scene.add(dirLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    widthSlider.addEventListener("input", updateRoom);
    depthSlider.addEventListener("input", updateRoom);
    heightSlider.addEventListener("input", updateRoom);

    document.getElementById('exportButton').addEventListener('click', exportSceneToClipboard);
    document.getElementById('importButton').addEventListener('click', importSceneFromClipboard);

    createWalls();
}

function loadModels() {
    loadModel('arm', './models/arm.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
    loadModel('arm_kurze_schiene', './models/arm_kurze_schiene.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
    loadModel('arm_lange_schiene', './models/arm_lange_schiene.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
    loadModel('förderband', './models/förderband.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
    loadModel('förderband_hoch', './models/förderband_hoch.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
    loadModel('trager', './models/trager.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
    loadModel('multiarm', './models/multiarm.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
    loadModel('table', './models/table.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
    loadModel('pallete', './models/pallet.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
    loadModel('palletierer', './models/paketierer.glb', new THREE.Vector3(100, 100, 100), new THREE.Vector3(8, -22, 0));
}

function loadModel(key, url, scale, placementOffset = new THREE.Vector3(0, 0, 0)) {
    const loader = new GLTFLoader(loadingManager);
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);

    loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.scale.copy(scale);
        const boundingBox = new THREE.Box3().setFromObject(model);
        const center = boundingBox.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -boundingBox.min.y, -center.z);
        model.userData.placementOffset = placementOffset;
        models[key] = model;
        console.log(`Model "${key}" loaded successfully:`, model);
    },
    (xhr) => console.log(`Loading Model "${key}": ${Math.round(xhr.loaded / xhr.total * 100)}%`),
    (error) => console.error(`Error loading model "${key}":`, error));
}

function onAssetsLoaded() {
    console.log("All models are now ready!");
    setTimeout(() => {
        transformControls = new TransformControls(camera, renderer.domElement);
        scene.add(transformControls.getHelper());
        transformControls.addEventListener('dragging-changed', (event) => {
            controls.enabled = !event.value;
        });
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onDocumentKeyDown);
        document.addEventListener('keyup', onDocumentKeyUp);
        window.addEventListener('resize', onWindowResize);

        updateModelSelect();
        document.getElementById('modelSelect').addEventListener('change', (e) => {
            currentModelKey = e.target.value;
        });

        animate();
    }, 200);
}

function updateModelSelect() {
    const select = document.getElementById('modelSelect');
    select.innerHTML = "";
    Object.keys(models).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.text = key.replace(/_/g, " ");
        select.appendChild(option);
    });
    select.value = currentModelKey;
}

function createWalls() {
    walls.forEach(w => scene.remove(w));
    walls = [];

    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('/img/walllogo.png');

    wallTexture.flipY = true;
    wallTexture.wrapS = THREE.ClampToEdgeWrapping;
    wallTexture.wrapT = THREE.ClampToEdgeWrapping;
    wallTexture.repeat.set(1, 1);
    wallTexture.repeat.x = -1;
    wallTexture.offset.x = 1;

    // Using texture on the backside for inward facing walls
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        side: THREE.BackSide
    });

    const halfW = roomWidth / 2;
    const halfD = roomDepth / 2;

    // Rear Wall (positive z)
    let wallGeometry1 = new THREE.BoxGeometry(roomWidth, roomHeight, 10);
    let wall1 = new THREE.Mesh(wallGeometry1, wallMaterial);
    wall1.position.set(0, roomHeight / 2, halfD);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    wall1.userData.normal = new THREE.Vector3(0, 0, -1); // Inward normal
    scene.add(wall1);
    walls.push(wall1);

    // Front Wall (negative z)
    let wallGeometry2 = new THREE.BoxGeometry(roomWidth, roomHeight, 10);
    let wall2 = new THREE.Mesh(wallGeometry2, wallMaterial);
    wall2.position.set(0, roomHeight / 2, -halfD);
    wall2.castShadow = true;
    wall2.receiveShadow = true;
    wall2.userData.normal = new THREE.Vector3(0, 0, 1); // Inward normal
    scene.add(wall2);
    walls.push(wall2);

    // Right Wall (positive x)
    let wallGeometry3 = new THREE.BoxGeometry(10, roomHeight, roomDepth);
    let wall3 = new THREE.Mesh(wallGeometry3, wallMaterial);
    wall3.position.set(halfW, roomHeight / 2, 0);
    wall3.castShadow = true;
    wall3.receiveShadow = true;
    wall3.userData.normal = new THREE.Vector3(-1, 0, 0); // Inward normal
    scene.add(wall3);
    walls.push(wall3);

    // Left Wall (negative x)
    let wallGeometry4 = new THREE.BoxGeometry(10, roomHeight, roomDepth);
    let wall4 = new THREE.Mesh(wallGeometry4, wallMaterial);
    wall4.position.set(-halfW, roomHeight / 2, 0);
    wall4.castShadow = true;
    wall4.receiveShadow = true;
    wall4.userData.normal = new THREE.Vector3(1, 0, 0); // Inward normal
    scene.add(wall4);
    walls.push(wall4);

    render();
}

function updateWallVisibility() {
    const center = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3().subVectors(center, camera.position).normalize();
    const ray = new THREE.Raycaster(camera.position, direction);
    const intersects = ray.intersectObjects(walls, true);

    walls.forEach(w => w.visible = true);

    if (intersects.length > 0) {
        const distanceToCenter = camera.position.distanceTo(center);
        if (intersects[0].distance < distanceToCenter) {
            intersects[0].object.visible = false;
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    render();
    updateWallVisibility();
}

function onPointerDown(event) {
    if (event.target.closest('#uiPanel')) return;
    event.preventDefault();
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
        let clickedObject = intersects[0].object;
        while (clickedObject.parent && clickedObject.parent !== scene) {
            clickedObject = clickedObject.parent;
        }

        if (isShiftDown) {
            if (clickedObject === plane || walls.includes(clickedObject)) {
                console.warn("Cannot delete the floor or walls.");
                return;
            }
            scene.remove(clickedObject);
            objects = objects.filter(obj => obj !== clickedObject);
            deselectObject();
            render();
            updateCostList();
        } else if (isCtrlDown) {
            if (currentModelKey && models[currentModelKey]) {
                const objectToPlace = models[currentModelKey].clone();
                objectToPlace.position.copy(intersects[0].point).add(intersects[0].face.normal);
                objectToPlace.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
                if (objectToPlace.userData.placementOffset) {
                    objectToPlace.position.add(objectToPlace.userData.placementOffset);
                }
                objectToPlace.userData.modelKey = currentModelKey;
                objectToPlace.userData.cost = modelCosts[currentModelKey] || 0;
                objectToPlace.castShadow = true;
                objectToPlace.receiveShadow = true;
                scene.add(objectToPlace);
                objects.push(objectToPlace);
                render();
                updateCostList();
            } else {
                console.warn("No model selected for placement.");
            }
        } else if (isAltDown) {
            if (!walls.includes(clickedObject) && clickedObject !== plane) {
                selectObject(clickedObject);
            } else {
                deselectObject();
            }
        } else {
            return;
        }
    } else {
        deselectObject();
    }
}

function updateCostList() {
    const costList = document.getElementById('costList');
    const totalCostElem = document.getElementById('totalCost');
    let total = 0;
    costList.innerHTML = '';

    const objectsIgnoringPallette = objects.filter(obj =>
        obj.userData && obj.userData.modelKey && obj.userData.modelKey !== 'pallete'
    );
    const placedCount = objectsIgnoringPallette.length;

    const formatter = new Intl.NumberFormat('de-CH', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    objects.forEach(obj => {
        if (obj.userData && obj.userData.modelKey) {
            const cost = obj.userData.cost || 0;
            total += cost;
            const li = document.createElement('li');
            li.textContent = obj.userData.modelKey.replace(/_/g, " ") + ": " 
                            + formatter.format(cost) + " CHF";
            costList.appendChild(li);
        }
    });
    totalCostElem.textContent = formatter.format(total);

    const plannedEmissionsNew = baselinePlannedEmissions.map(value => {
        const updatedVal = value * (1 - 0.08 * placedCount);
        return Math.max(75, updatedVal);
      });
      emissionsChart.data.datasets[1].data = plannedEmissionsNew;

      const afterOptNew = baselineAfterOptimization.map(value => {
        const updatedVal = value * (1 - 0.08 * placedCount);
        return Math.max(1, updatedVal);
      });
      efficiencyChart.data.datasets[1].data = afterOptNew;

    emissionsChart.update();
    efficiencyChart.update();
}

function exportSceneToClipboard() {
    const modelsArray = objects.filter(obj => obj.userData && obj.userData.modelKey).map(obj => {
        return {
            modelKey: obj.userData.modelKey,
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z }
        };
    });

    const exportData = {
        room: {
            width: roomWidth,
            depth: roomDepth,
            height: roomHeight
        },
        models: modelsArray
    };

    const jsonStr = JSON.stringify(exportData, null, 2);

    navigator.clipboard.writeText(jsonStr).then(() => {
        console.log("Scene (including room data) exported to clipboard.");
    }).catch(err => {
        console.error("Error copying to clipboard:", err);
        alert("Export error!");
    });
}

function importSceneFromClipboard() {
    navigator.clipboard.readText().then(text => {
        let importData;
        try {
            importData = JSON.parse(text);
        } catch (e) {
            alert("Clipboard does not contain valid JSON!");
            return;
        }

        let modelsData = [];

        if (typeof importData === "object" && !Array.isArray(importData)) {
            if (importData.room && typeof importData.room === "object") {
                if (typeof importData.room.width === "number" &&
                    typeof importData.room.depth === "number" &&
                    typeof importData.room.height === "number") {
                    roomWidth = importData.room.width;
                    roomDepth = importData.room.depth;
                    roomHeight = importData.room.height;

                    widthSlider.value = roomWidth;
                    depthSlider.value = roomDepth;
                    heightSlider.value = roomHeight;
                    widthValue.textContent = roomWidth;
                    depthValue.textContent = roomDepth;
                    heightValue.textContent = roomHeight;
                    createWalls();
                } else {
                    alert("Invalid room data!");
                    return;
                }
            }
            if (importData.models && Array.isArray(importData.models)) {
                modelsData = importData.models;
            } else {
                alert("Missing 'models' array in import!");
                return;
            }
        } else if (Array.isArray(importData)) {
            modelsData = importData;
        } else {
            alert("Invalid import format!");
            return;
        }

        objects.filter(obj => obj.userData && obj.userData.modelKey).forEach(obj => {
            scene.remove(obj);
        });
        objects = objects.filter(obj => !(obj.userData && obj.userData.modelKey));

        modelsData.forEach(item => {
            if (typeof item.modelKey !== "string" ||
                typeof item.position !== "object" ||
                typeof item.rotation !== "object" ||
                typeof item.scale !== "object" ||
                typeof item.position.x !== "number" ||
                typeof item.position.y !== "number" ||
                typeof item.position.z !== "number" ||
                typeof item.rotation.x !== "number" ||
                typeof item.rotation.y !== "number" ||
                typeof item.rotation.z !== "number" ||
                typeof item.scale.x !== "number" ||
                typeof item.scale.y !== "number" ||
                typeof item.scale.z !== "number") {
                console.warn("Skipping invalid element:", item);
                return;
            }
            if (!models[item.modelKey]) {
                console.warn(`Model "${item.modelKey}" not found. Skipping element.`);
                return;
            }
            const objectToPlace = models[item.modelKey].clone();
            objectToPlace.position.set(item.position.x, item.position.y, item.position.z);
            objectToPlace.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
            objectToPlace.scale.set(item.scale.x, item.scale.y, item.scale.z);
            objectToPlace.userData.modelKey = item.modelKey;

            objectToPlace.userData.cost = modelCosts[item.modelKey] || 0;

            objectToPlace.castShadow = true;
            objectToPlace.receiveShadow = true;
            scene.add(objectToPlace);
            objects.push(objectToPlace);
        });
        render();
        updateCostList();
    }).catch(err => {
        console.error("Error reading clipboard:", err);
        alert("Import error!");
    });
}

function selectObject(object) {
    deselectObject();
    selectedObject = object;
    transformControls.attach(object);
    render();
}

function deselectObject() {
    if (selectedObject) {
        transformControls.detach();
        selectedObject = null;
    }
    render();
}

function fadeOutLoadingScreen() {
    loadingScreen.classList.add('fade-out');
    loadingScreen.style.display = 'none';
}

function onDocumentKeyDown(event) {
    if (event.key === 'Shift') isShiftDown = true;
    if (event.key === 'Control') isCtrlDown = true;
    if (event.key === 'Alt') isAltDown = true;
    switch (event.key) {
        case 'g':
            transformControls.setMode('translate');
            break;
        case 'r':
            transformControls.setMode('rotate');
            break;
        case 's':
            transformControls.setMode('scale');
            break;
    }
}

function onDocumentKeyUp(event) {
    if (event.key === 'Shift') isShiftDown = false;
    if (event.key === 'Control') isCtrlDown = false;
    if (event.key === 'Alt') isAltDown = false;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function render() {
    renderer.render(scene, camera);
}

function updateRoom() {
    roomWidth = parseInt(widthSlider.value);
    roomDepth = parseInt(depthSlider.value);
    roomHeight = parseInt(heightSlider.value);
    widthValue.textContent = roomWidth;
    depthValue.textContent = roomDepth;
    heightValue.textContent = roomHeight;
    createWalls();
}