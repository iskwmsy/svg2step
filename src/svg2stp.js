export { generateStepFile, createStepFromSVGPathItems };
import { createSVGPathString, calculateProjectedVertex } from "./item-SVGPath.js";

const cc_msg = "\u001b[33msvg2stp.js : "; // yellow for console.log
const cc_reset = "\u001b[0m"; // reset color

///////////////////////////////////////////////////////////////////////////////
// main
///////////////////////////////////////////////////////////////////////////////

function createStepFromSVGPathItems(svgPathItems) {
  //1. convert path string to spline dat
  const bezierPathItems = [];
  svgPathItems.forEach((pathItem) => {
    const bezierPathItem = convertSVGPathItemsToBezierPathItems(pathItem);
    console.log(`${cc_msg}bezierPathItem :${cc_reset}`, bezierPathItem);
    bezierPathItems.push(bezierPathItem);
  });
  console.log(`${cc_msg}bezierPathItems :${cc_reset}`, bezierPathItems);
  //2. convert spline data to bezier data (control points)
  // multipy transform and magnification here.
  const data = [];
  bezierPathItems.forEach((bezierPathItem) => {
    data.push(
      convertToBezierCurvesData(bezierPathItem.bezierPathArray3D, bezierPathItem.transformation)
    );
  });
  console.log(`${cc_msg}data :${cc_reset}`, data);
  const mergedData = processControlPointsData(data);
  console.log(`${cc_msg}mergedData :${cc_reset}`, mergedData);
  //3. generate step file
  const step = generateStepFile(mergedData);
  console.log(`${cc_msg}step :${cc_reset}`, step);
  return step;
}

///////////////////////////////////////////////////////////////////////////////
// SVGpathItems -> BezierPathItems functions
///////////////////////////////////////////////////////////////////////////////
function convertSVGPathItemsToBezierPathItems(pathItem) {
  console.log(`${cc_msg}imported SVGPathItem is :${cc_reset}`, pathItem);

  let data = { bezierPathArray3D: [] };
  pathItem.pathArray3D.forEach((node, index) => {
    let command = node.command;
    let x = node.point.x;
    let y = node.point.y;
    let z = node.point.z;
    let endCommand = node.endCommand;

    let onCurve = command !== "C";
    if (index > 0) {
      if (pathItem.pathArray3D[index - 1].command === "C") {
        onCurve = false;
      }
    }
    let isM = command === "M";
    let isZ = endCommand === "Z";

    data.bezierPathArray3D.push({
      point: { x: x, y: y, z: z },
      onCurve: onCurve,
      M: isM,
      Z: isZ,
    });
  });
  data.transformation = pathItem.transformation;
  data.style = pathItem.style;
  return data;
}
///////////////////////////////////////////////////////////////////////////////
// Spline -> Bezier
///////////////////////////////////////////////////////////////////////////////
function convertToBezierCurvesData(bezierPathArray3D, transformation) {
  console.log(`${cc_msg}imported bezierPathArray3D${cc_reset}`, bezierPathArray3D);
  let bezierCurves = [];
  let currentCurve = [];
  let startIndex = 0;

  bezierPathArray3D.forEach((node, index) => {
    const calcedP = calculateProjectedVertex(node.point, transformation);
    calcedP.y = -calcedP.y;

    if (node.M) {
      startIndex = index;
    }
    if (node.onCurve) {
      if (currentCurve.length > 0) {
        currentCurve.push([calcedP.x, calcedP.y, calcedP.z]);
        bezierCurves.push({ controlPoints: currentCurve });
      }
      currentCurve = [[calcedP.x, calcedP.y, calcedP.z]];
    } else {
      console.log(`${cc_msg}check1${cc_reset}`, node.point);
      console.log(`${cc_msg}check2${cc_reset}`, bezierPathArray3D[index - 1].point);
      if (
        // if curve control point is same as the previous point ignore
        // maybe shift it a litte bit is better.
        (node.point.x == bezierPathArray3D[index - 1].point.x &&
          node.point.y == bezierPathArray3D[index - 1].point.y &&
          node.point.z == bezierPathArray3D[index - 1].point.z) ||
        (node.point.x == bezierPathArray3D[index + 1].point.x &&
          node.point.y == bezierPathArray3D[index + 1].point.y &&
          node.point.z == bezierPathArray3D[index + 1].point.z)
      ) {
        calcedP.x += 0.00001;
        calcedP.y += 0.00001;
        calcedP.z += 0.00001;
        console.log(`${cc_msg}point ignored${cc_reset}`);
        //console.log("shifted");
        //currentCurve.push([calcedP.x, calcedP.y, calcedP.z]);
      } else {
        currentCurve.push([calcedP.x, calcedP.y, calcedP.z]);
      }
      if (index === bezierPathArray3D.length - 1) {
        bezierCurves.push({ controlPoints: currentCurve });
      }
    }
    if (node.Z) {
      if (
        node.point.x == bezierPathArray3D[startIndex].point.x &&
        node.point.y == bezierPathArray3D[startIndex].point.y &&
        node.point.z == bezierPathArray3D[startIndex].point.z
      ) {
        console.log(`${cc_msg}start point and end point are same${cc_reset}`);
      } else {
        const calcedStartP = calculateProjectedVertex(
          bezierPathArray3D[startIndex].point,
          transformation
        );
        bezierCurves.push({
          controlPoints: [
            [calcedP.x, calcedP.y, calcedP.z],
            [calcedStartP.x, -calcedStartP.y, calcedStartP.z],
          ],
        });
      }
      currentCurve = [];
    }
  });
  console.log(`${cc_msg}bezierCurves :${cc_reset}`, bezierCurves);
  return bezierCurves;
}
function processControlPointsData(data) {
  let result = [];
  data.forEach((item) => {
    result = result.concat(item);
  });
  return result;
}

///////////////////////////////////////////////////////////////////////////////
// generateStepFile
///////////////////////////////////////////////////////////////////////////////

function generateStepFile(bezierCurves) {
  const modelDescription = "svg2stp model"; // FreeCAD Model
  const shapeModelName = "svg2stp model for Plasticity"; // Open CASCADE Shape Model
  const stepProcessorName = "svg2stp 1.0"; // Open CASCADE STEP processor 7.6
  const authoringTool = "https://dev.cog.ooo/svg2stp/";
  const date = new Date().toISOString().replace("Z", "").split(".")[0];
  const header = `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('${modelDescription}'),'2;1');\nFILE_NAME('${shapeModelName}','${date}',('Author'),(''),'${stepProcessorName}','${authoringTool}','Unknown');\nFILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));\nENDSEC;\nDATA;`;
  const footer = "ENDSEC;\nEND-ISO-10303-21;";
  let pointDefinitions = "";
  let bezierDefinitions = "";
  let trimmedCurveDefinitions = "";
  let trimmedCurveReferences = [];
  let bezierNumber = 27;
  let trimmedCurveNumber = 26;
  bezierCurves.forEach((curve, curveIndex) => {
    let pointReferences = [];
    let pointNumber = 20 + curveIndex * 10;
    curve.controlPoints.forEach((point, pointIndex) => {
      const [x, y, z] = point;
      pointDefinitions += `#${pointNumber} = CARTESIAN_POINT('', (${x}, ${y}, ${z}));\n`;
      pointReferences.push(`#${pointNumber}`);
      pointNumber++;
    });
    const degree = curve.controlPoints.length - 1;
    const knotsMultiplicity = `${degree + 1}, ${degree + 1}`;
    bezierDefinitions += `#${bezierNumber} = B_SPLINE_CURVE_WITH_KNOTS('', ${degree}, (${pointReferences.join(
      ", "
    )}), .UNSPECIFIED., .F., .F., (${knotsMultiplicity}), (0., 1.), .PIECEWISE_BEZIER_KNOTS.);\n`;
    trimmedCurveDefinitions += `#${trimmedCurveNumber} = TRIMMED_CURVE('', #${bezierNumber}, (##${pointReferences[0].substring(
      1
    )}, PARAMETER_VALUE(0.)), (##${pointReferences[pointReferences.length - 1].substring(
      1
    )}, PARAMETER_VALUE(1.)), .T., .PARAMETER.);\n`;
    trimmedCurveReferences.push(`#${trimmedCurveNumber}`);
    bezierNumber += 100;
    trimmedCurveNumber += 100;
  });
  const shapeRepresentation = `#10 = GEOMETRICALLY_BOUNDED_WIREFRAME_SHAPE_REPRESENTATION('',(#11,#15),(${trimmedCurveReferences.join(
    ", "
  )}));\n#15 = GEOMETRIC_CURVE_SET('',(${trimmedCurveReferences.join(", ")}));`;

  return `${header}\n${pointDefinitions}${bezierDefinitions}${trimmedCurveDefinitions}\n${shapeRepresentation}\n${footer}`;
}

///////////////////////////////////////////////////////////////////////////////
// pathItems -> String -> Spline functions
///////////////////////////////////////////////////////////////////////////////

function convertSVGPathItemsToString(svgPathItems) {
  let result = [];
  svgPathItems.forEach((pathItem) => {
    let str = "";
    console.log(`${cc_msg}pathItem :${cc_reset}`, pathItem);
    pathItem.pathArray3D.forEach((node) => {
      str = createSVGPathString(
        str,
        node.point.x,
        node.point.y,
        node.point.z,
        node.command,
        node.endCommand
      );
    });
    result.push(str);
  });
  return result;
}

function convertSVGPathStringToSpline(pathString) {
  const commands = pathString.match(/[A-Za-z]/g);
  const points = pathString.match(/-?\d+(\.\d+)?/g);

  let data = { controlPoints: [] };
  let pointIndex = 0;
  let newSubpath = false;

  for (const command of commands) {
    let onCurve = command !== "C";
    let isM = command === "M";
    let isZ = command === "Z";

    let pointsPerCommand;
    if (command === "M" || command === "L" || command === "Z") {
      pointsPerCommand = 1;
    } else if (command === "C") {
      pointsPerCommand = 3;
    } else {
      continue;
    }

    if (isZ) {
      data.controlPoints[data.controlPoints.length - 1].Z = true;
      newSubpath = true;
      continue;
    }

    for (let i = 0; i < pointsPerCommand && pointIndex < points.length; i++) {
      const x = parseFloat(points[pointIndex++]);
      const y = parseFloat(points[pointIndex++]);
      const z = 0.0;

      if (command === "C" && i === pointsPerCommand - 1) {
        onCurve = true;
      }

      data.controlPoints.push({ x, y, z, onCurve: onCurve, M: isM || newSubpath, Z: isZ });

      if (command === "C") {
        onCurve = false;
      }

      if (isM || newSubpath) {
        newSubpath = false;
      }
    }
  }
  // Check if the path ends with a Z command and set the Z flag for the last point
  if (commands[commands.length - 1] === "Z") {
    data.controlPoints[data.controlPoints.length - 1].Z = true;
  }
  return data;
}
