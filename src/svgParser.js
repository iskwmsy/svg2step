// SVG Parser
export { parseSVG, parseSVGFiles };
import { calc_roundNumber } from "./calc.js";
import { createSVGPathItems } from "./item-SVGPath.js";

const cc_msg = "\u001b[36msvgParser.js : "; // cyan for console.log
const cc_reset = "\u001b[0m"; // reset color

///////////////////////////////////////////////////////////////////////////////
// Parse SVG
///////////////////////////////////////////////////////////////////////////////

async function parseSVGFiles(files, scope) {
  let resultSVGPathItems = [];
  for (const file of Array.from(files)) {
    if (file.type.match("svg")) {
      console.log(cc_msg + "file = \n" + cc_reset, file);
      const svgTxtConverted = await convertFileShapesToPath(file, scope);
      console.log(cc_msg + "svgTxtConverted  = \n" + cc_reset, svgTxtConverted);
      const path2Ddata = createPath2DData(svgTxtConverted);
      resultSVGPathItems = resultSVGPathItems.concat(
        structuredClone(createSVGPathItems(path2Ddata, scope))
      );
    }
  }
  console.log(cc_msg + "resultSVGPathItems = \n" + cc_reset, resultSVGPathItems);
  return resultSVGPathItems;
}

function convertFileShapesToPath(file, scope) {
  return new Promise((resolve) => {
    scope.project.importSVG(file, {
      svg: String,
      expandShapes: true, // expanded shape to path
      insert: false, // don't add to the project
      onLoad: function (item) {
        console.log(cc_msg + "item = \n" + cc_reset, item);
        resolve(item.exportSVG({ asString: true })); // PaperJS --> svg
      },
    });
  });
}

function parseSVG(svgTxt, scope) {
  const svgTxtConverted = convertShapeToPath(svgTxt, scope); // svg --> PaperJS to convert shapes to paths.
  console.log(cc_msg + "svg shapes converted to paths = \n" + cc_reset, svgTxtConverted);
  const path2Ddata = createPath2DData(svgTxtConverted);
  return path2Ddata;
  // const data = splitPathData(svgTxtConverted);
  // console.log(cc_msg + "clip width / height = " + cc_reset + data.width + " / " + data.height);
  // console.log(cc_msg + `parsed ${data.paths.length} path objects` + cc_reset);
  // let pathStrings = [];
  // // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // data.paths.forEach((path) => {
  //   const pathData = path.getAttribute("d");
  //   const normalizedPathData = normalizePathData(pathData);
  //   const style = extractStyle(path);
  //   console.log(cc_msg + "path data = \n" + cc_reset + pathData);
  //   console.log(cc_msg + "normalized path data = \n" + cc_reset + normalizedPathData);
  //   console.log(cc_msg + "path style = " + cc_reset, style);
  //   pathStrings.push({ pathString: normalizedPathData, style: style });
  // });
  // return { width: data.width, height: data.height, paths: pathStrings };
}

// Convert SVG Shapes to Paths.
function convertShapeToPath(str, scope) {
  //Convert SVG Shapes to Paths.
  const convertedSvgPath = scope.project.importSVG(str, {
    svg: String,
    expandShapes: true, // expanded shape to path
    insert: false, // don't add to the project
  });
  console.log(cc_msg + "convertedSvgPath = " + cc_reset, convertedSvgPath);
  const result = convertedSvgPath.exportSVG({ asString: true }); // PaperJS --> svg
  //convertedPath.remove(); //don't show tmp path
  return result;
}

function createPath2DData(svgTxtConverted) {
  const data = splitPathData(svgTxtConverted);
  console.log(cc_msg + "clip width / height = " + cc_reset + data.width + " / " + data.height);
  console.log(cc_msg + `parsed ${data.paths.length} path objects` + cc_reset);
  let pathStrings = [];
  data.paths.forEach((path) => {
    const pathData = path.getAttribute("d");
    const normalizedPathData = normalizePathData(pathData);
    const style = extractStyle(path);
    console.log(cc_msg + "path data = \n" + cc_reset + pathData);
    console.log(cc_msg + "normalized path data = \n" + cc_reset + normalizedPathData);
    console.log(cc_msg + "path style = " + cc_reset, style);
    pathStrings.push({ pathString: normalizedPathData, style: style });
  });
  return { width: data.width, height: data.height, paths: pathStrings }; //path2DData
}

function splitPathData(str) {
  const parser = new DOMParser();
  const svg = parser.parseFromString(str, "image/svg+xml").childNodes[0];
  console.log(cc_msg + "svg document = " + cc_reset, svg);

  const paths = svg.querySelectorAll("path"); // Array of paths
  const clipMask = svg.querySelectorAll(" defs > clipPath > rect");
  const w = clipMask[0].getAttribute("width");
  const h = clipMask[0].getAttribute("height");

  return {
    paths: paths,
    width: w,
    height: h,
  };
}

// Extract style from path element.
function extractStyle(path) {
  // Styles are converted to Paper.js format.
  const style = {};
  if (path.hasAttribute("fill")) {
    style.fillColor = path.getAttribute("fill");
  }
  if (path.hasAttribute("fill-rule")) {
    style.fillRule = path.getAttribute("fill-rule");
  }
  if (path.hasAttribute("stroke")) {
    if (path.getAttribute("stroke") != "none") {
      style.strokeColor = path.getAttribute("stroke");
    }
  }
  if (path.hasAttribute("stroke-width")) {
    if (path.getAttribute("stroke") != "none") {
      style.strokeWidth = Number(path.getAttribute("stroke-width"));
    }
  }
  if (path.hasAttribute("stroke-linecap")) {
    style.strokeCap = path.getAttribute("stroke-linecap");
  }
  if (path.hasAttribute("stroke-linejoin")) {
    style.strokeJoin = path.getAttribute("stroke-linejoin");
  }
  if (path.hasAttribute("stroke-dasharray")) {
    const arrayStr = path.getAttribute("stroke-dasharray");
    style.dashArray = arrayStr.split(",").map(Number);
  }
  if (path.hasAttribute("stroke-dashoffset")) {
    style.dashOffset = Number(path.getAttribute("stroke-dashoffset"));
  }
  return style;
}

// Normalize path data.
function normalizePathData(pathData, rounding = 2) {
  const commandPattern = /[MmLlHhVvCcZz]|[+-]?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?/g;
  const commands = pathData.match(commandPattern);

  let currentX = 0;
  let currentY = 0;
  let lastMx = 0;
  let lastMy = 0;
  let newPathData = "";

  while (commands.length > 0) {
    const command = commands.shift();
    const isRelative = /[a-z]/.test(command);
    let x, y, x1, y1, x2, y2;

    switch (command.toUpperCase()) {
      case "M":
      case "L":
        x = parseFloat(commands.shift());
        y = parseFloat(commands.shift());
        if (isRelative) {
          x += currentX;
          y += currentY;
        }
        x = calc_roundNumber(x, rounding);
        y = calc_roundNumber(y, rounding);
        newPathData += `${command.toUpperCase()}${x},${y} `;
        if (command.toUpperCase() === "M") {
          lastMx = x;
          lastMy = y;
        }
        currentX = x;
        currentY = y;
        break;
      case "H":
        x = parseFloat(commands.shift());
        if (isRelative) {
          x += currentX;
        }
        x = calc_roundNumber(x, rounding);
        newPathData += `L${x},${currentY} `;
        currentX = x;
        break;
      case "V":
        y = parseFloat(commands.shift());
        if (isRelative) {
          y += currentY;
        }
        y = calc_roundNumber(y, rounding);
        newPathData += `L${currentX},${y} `;
        currentY = y;
        break;
      case "C":
        x1 = parseFloat(commands.shift());
        y1 = parseFloat(commands.shift());
        x2 = parseFloat(commands.shift());
        y2 = parseFloat(commands.shift());
        x = parseFloat(commands.shift());
        y = parseFloat(commands.shift());

        if (isRelative) {
          x1 += currentX;
          y1 += currentY;
          x2 += currentX;
          y2 += currentY;
          x += currentX;
          y += currentY;
        }
        newPathData += `C${x1},${y1} ${x2},${y2} ${x},${y} `;
        currentX = x;
        currentY = y;
        break;
      case "Z":
        newPathData += "Z ";
        currentX = lastMx;
        currentY = lastMy;
        break;
    }
  }
  return newPathData.trim();
}
