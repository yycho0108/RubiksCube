/**
 * Created by jamiecho on 8/24/16.
 */

function cubeMaterial(x, y, z) {

    var materials = new Array(6);

    var images = ['right','left','up','down','front','back'];

    var loader = new THREE.TextureLoader();

    for(var i in images){
        var image = images[i];
        materials[i] = (
            new THREE.MeshBasicMaterial({
                map : loader.load('images/cube/' + image + '.png'),
                //specular: 0xffffff,
                //emissive: 0x000000,
                //shininess: 30,
                //overdraw: true
            }));
    }


    /* COLORING */
    //var colors = [0xff0000, 0x00ff00, 0x0000ff, 0x00ffff, 0xff00ff, 0xffff00];

    /*for (var i = 0; i < 6; ++i) {
        var color;
        //R-L-U-D-F-B
        if ((i == 0 && x == 1) ||
            (i == 1 && x == -1) ||
            (i == 2 && y == 1) ||
            (i == 3 && y == -1) ||
            (i == 4 && z == 1) ||
            (i == 5 && z == -1)
        )
            color = colors[i];
        else
            color = 0x000000;

        materials[i] = new THREE.MeshPhongMaterial({
            color: color,
            shading: THREE.FlatShading,
            specular: 0xffffff,
            emissive: 0x000000,
            shininess: 30,
            overdraw: true
        });
    }*/

    return new THREE.MeshFaceMaterial(materials);
}

/* RubiksCube */
function RubiksCube(size) {

    this.size = size;

    THREE.Object3D.call(this); //inheritance

    this.cubes = ndarray([3,3,3]);

    this.active = []; //active group for movement

    this.pivotAxis = '-'; //indicates no lock

    this.pivotDir = 0; //indicates no lock

    this.state = 'free';

    for (var x = -1; x <= 1; ++x) {
        for (var y = -1; y <= 1; ++y) {
            for (var z = -1; z <= 1; ++z) {

                var material = cubeMaterial(x, y, z);
                var geometry = new THREE.BoxGeometry(size, size, size);

                var cube_one = new THREE.Mesh(geometry, material);
                cube_one.position.x = x * size; // * 1.25;
                cube_one.position.y = y * size; // * 1.25;
                cube_one.position.z = z * size; // * 1.25;

                cube_one.edgesHelper = new THREE.EdgesHelper(cube_one, 0x000000);

                cube_one.edgesHelper.material.linewidth = 2;

                cube_one.name = 'cube(' + x + ',' + y + ',' + z + ')'; //useful for debugging

                this.add(cube_one);
                this.add(cube_one.edgesHelper);

                this.cubes[x + 1][y + 1][z + 1] = cube_one;
                //save reference
            }
        }
    }
}

RubiksCube.prototype = Object.create(THREE.Object3D.prototype);
RubiksCube.prototype.constructor = RubiksCube;

RubiksCube.prototype.lock = function (sel, axis, dir) {
    this.pivotAxis = axis;
    this.pivotDir = dir;

    var pos = {
        x: 0,
        y: 0,
        z: 0
    };

    var lim = {
        x: [-1, 1],
        y: [-1, 1],
        z: [-1, 1]
    };

    pos[axis] = sel[axis];
    lim[axis] = [sel[axis], sel[axis]];

    /*var x = (axis == 'x')?sel.x:0;
     var y = (axis == 'y')?sel.y:0;
     var z = (axis == 'z')?sel.z:0;
     */
    var cube;
    this.pivot = new THREE.Object3D();

    var pivot = this.pivot;
    pivot.rotation.set(0, 0, 0);
    pivot.updateMatrixWorld();

    for (x = lim.x[0]; x <= lim.x[1]; ++x) {
        for (y = lim.y[0]; y <= lim.y[1]; ++y) {
            for (z = lim.z[0]; z <= lim.z[1]; ++z) {
                cube = this.cubes[x + 1][y + 1][z + 1];
                //if(cube != this.pivot){
                THREE.SceneUtils.attach(cube, scene, pivot);
                this.active.push(cube);
                //}
            }
        }
    }

    scene.add(this.pivot);
};


RubiksCube.prototype.release = function () {
    var pivot = this.pivot;

    pivot.matrixWorldNeedsUpdate = true;
    pivot.updateMatrix();
    pivot.updateMatrixWorld();

    this.updateMatrixWorld();

    if (pivot) {

        for (i in this.active) {
            var cube = this.active[i];
            //cube.applyMatrix(pivot.matrixWorld);
            THREE.SceneUtils.detach(cube, pivot, this); //back onto the cube!
        }

        this.pivotAxis = '-';
        this.pivotDir = 0;

        scene.remove(this.pivot);

        this.pivot = null;
        this.active = [];

        this.reIndex();
        this.state = 'free';
    }

};

RubiksCube.prototype.snap = function () {
    var angle = mod_pos(this.pivot.rotation[this.pivotAxis], Math.PI * 2);

    this.pivotDir = contain(this.target - angle, -0.5, 0.5);
    this.rotateOnPivot();
    angle = mod_pos(this.pivot.rotation[this.pivotAxis], Math.PI * 2);

    if (similar(angle, this.target, 0.01)) {
        this.pivot.rotation[this.pivotAxis] = quantize(angle, Math.PI/2); //snap
        this.pivot.updateMatrix();
        this.state = 'releasing';
    }
};

RubiksCube.prototype.startReturn = function () {
    if (this.pivot) {
        var angle = mod_pos(this.pivot.rotation[this.pivotAxis], Math.PI * 2);
        this.target = quantize(angle, Math.PI/2);
        this.state = 'returning';
    }
};

function rotateAroundWorldAxis(object, axis, radians) {
    var rotWorldMatrix = new THREE.Matrix4();
    rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);
    object.applyMatrix(rotWorldMatrix);
}

RubiksCube.prototype.rotateOnPivot = function () {
    this.pivot.rotation[this.pivotAxis] += (this.pivotDir * 0.1);
};

RubiksCube.prototype.reIndex = function () {

    reindexed = ndarray([3, 3, 3]);

    // finish rotation
    for (x = -1; x <= 1; ++x) {
        for (y = -1; y <= 1; ++y) {
            for (z = -1; z <= 1; ++z) {

                cube = this.cubes[x + 1][y + 1][z + 1];

                var idx = this.get_index(cube);

                reindexed[idx.x + 1][idx.y + 1][idx.z + 1] = cube;

                // quantize all

                /*cube.position.x = quantize(cube.position.x, (1.25 * this.size));
                cube.position.y = quantize(cube.position.y, (1.25 * this.size));
                cube.position.z = quantize(cube.position.z, (1.25 * this.size));

                cube.rotation.x = quantize(cube.rotation.x, Math.PI / 2);
                cube.rotation.y = quantize(cube.rotation.y, Math.PI / 2);
                cube.rotation.z = quantize(cube.rotation.z, Math.PI / 2);*/

            }
        }
    }

    this.cubes = reindexed;
};

RubiksCube.prototype.get_index = function (cube) {
    var pos = new THREE.Vector3();
    //console.log("CUBE", cube);
    pos.setFromMatrixPosition(cube.matrixWorld);
    //console.log("POS",pos);

    pos.x = Math.round(pos.x / (this.size));
    pos.y = Math.round(pos.y / (this.size));
    pos.z = Math.round(pos.z / (this.size));

    return pos;
};

function count(l,v){
    var cnt = 0;
    for(i in l){
        if(l[i] == v){
            ++cnt;
        }
    }
    return cnt;
}

RubiksCube.prototype.shuffle = function(n){
    if(n === undefined)
        n = 16; //default shuffle num.

    var pivots = [];

    var lim = [-1,0,1];
    for(xi in lim){
        var x = lim[xi];
        for(yi in lim){
            var y = lim[yi];
            for(zi in lim){
                var z = lim[zi];
                if(count([x,y,z],0) == 2){
                    pivots.push(new THREE.Vector3(x,y,z));
                }
            }
        }
    }

    // lock - rotate - snap - release - reindex

    for(var i=0; i<n; ++i){

        var idx = Math.floor(Math.random() * pivots.length);

        var pivot = pivots[idx];

        var axis = 'xyz'[argmax(Math.abs(pivot.x),Math.abs(pivot.y),Math.abs(pivot.z)).idx];

        this.lock(pivot,axis,1);

        this.pivot.rotation[this.pivotAxis] += Math.PI / 2;

        this.release();

        this.reIndex();
    }
};