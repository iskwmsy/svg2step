const cc_msg = "\u001b[35mitem-SVGPath.js : "; // magenta for console.log
const cc_reset = "\u001b[0m"; // reset color

export { createSVGPathItems, drawSVGPathItems, createSVGPathString, calculateProjectedVertex };
import { calc_roundNumber } from "./calc.js";

class SVGPathItem {
  constructor(pathArray3D, style, translation) {
    // Constructor Function
    this.pathArray3D = pathArray3D;
    this.style = style;

    this.transformation = {
      translation: translation,
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0 },
      anchor: { x: 0, y: 0, z: 0 },
    };
  }
}

class SVGPathNode {
  constructor(c, p, ec) {
    // Constructor Function
    this.command = c;
    this.point = p;
    this.endCommand = ec;
  }
}

function createSVGPathItems(path2Ddata, scope) {
  const rounding = 2;
  const result = [];
  path2Ddata.paths.forEach((path) => {
    const tempPath = new scope.CompoundPath(path.pathString);
    tempPath.style = path.style;
    const pathArray2D = path.pathString.match(
      /([MLCZ])[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?|Z/g
    );

    console.log(
      cc_msg + "PathArray2D = " + cc_reset + pathArray2D + " | length = " + pathArray2D.length
    );
    const pathArray3D = createSVGPathArray3D(pathArray2D);
    pathArray3D.forEach((node) => {
      // move center to (0,0)
      node.point.x -= tempPath.bounds.center.x;
      node.point.y -= tempPath.bounds.center.y;
      node.point.x = calc_roundNumber(node.point.x, rounding);
      node.point.y = calc_roundNumber(node.point.y, rounding);
      // Flip vertically since y values of SVG grow top -> down and the y values of the 3D mesh grow bottom
      //node.point.y *= -1;
    });
    console.log(cc_msg + "centered PathArray3D = " + cc_reset, pathArray3D);
    const translation = {
      x: calc_roundNumber(tempPath.bounds.center.x - path2Ddata.width / 2, rounding),
      y: -calc_roundNumber(tempPath.bounds.center.y - path2Ddata.height / 2, rounding),
      z: 0,
    };
    result.push(new SVGPathItem(pathArray3D, path.style, translation));
    tempPath.remove();
  });
  return result;
}
function createSVGPathArray3D(pathArray2D) {
  let result = [];
  let i = 0;
  while (i < pathArray2D.length) {
    let head, x, y, z, end;
    z = 0.0;
    head = pathArray2D[i].slice(0, 1);

    if (head == "M" || head == "L" || head == "C") {
      x = Number(pathArray2D[i].slice(1));
      i++;
    } else if (head == "Z") {
      const prevNode = result[result.length - 1];
      result[result.length - 1] = new SVGPathNode(prevNode.command, prevNode.point, "Z");
      i++;
      continue;
    } else {
      head = "";
      x = pathArray2D[i];
      i++;
    }
    end = pathArray2D[i].slice(-1);
    if (end == "Z") {
      y = pathArray2D[i].slice(0, -1);
      i++;
    } else {
      y = pathArray2D[i];
      end = "";
      i++;
    }
    result.push(new SVGPathNode(head, { x: x, y: y, z: z }, end));
  }
  return result;
}

function drawSVGPathItems(svgPathItems, scope) {
  let svgDrawPaths = [];
  svgPathItems.forEach((path) => {
    svgDrawPaths = svgDrawPaths.concat(createSVGDrawPath(path, scope));
  });
  svgDrawPaths.forEach((path) => {
    const drawPath = new scope.CompoundPath(path.pathString);
    drawPath.style = path.style;
  });
  console.log(cc_msg + "svgDrawPaths = " + cc_reset, svgDrawPaths);
}

function createSVGDrawPath(path, scope) {
  let str = "";
  let style = null;
  style = path.style;
  path.pathArray3D.forEach((node) => {
    const projectedPoint = calculateProjectedVertex(node.point, path.transformation);
    str = createSVGPathString(
      str,
      projectedPoint.x + scope.view.center.x,
      projectedPoint.y + scope.view.center.y,
      projectedPoint.z,
      node.command,
      node.endCommand
    );
  });
  console.log(cc_msg + "DrawPath = " + cc_reset + str);
  return { pathString: str, style: style };
}

function createSVGPathString(str, x, y, z, command, endCommand) {
  str = str + command + x + " " + y + endCommand + " ";
  return str;
}

function calculateProjectedVertex(point, transformation) {
  const x = calc_roundNumber(point.x + transformation.translation.x);
  const y = calc_roundNumber(point.y - transformation.translation.y);
  const z = calc_roundNumber(point.z + transformation.translation.z);
  return { x: x, y: y, z: z };
}
