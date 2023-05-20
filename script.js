// 230507 stable
import { generateStepFile, createStepFromSVGPathItems } from "./src/svg2stp.js";
import { copyToClipBoard, pasteFromClipBoard } from "./src/clipboard.js";
import { parseSVG } from "./src/svgParser.js";
import { createSVGPathItems, drawSVGPathItems } from "./src/item-SVGPath.js";
import { data } from "./data/data.js";

const cc_msg = "\u001b[32m"; // green for console.log
const cc_reset = "\u001b[0m"; // reset color

let svgPathItems = [];
const canvas_1 = document.getElementById("canvas_1");
const scope_canvas_1 = new paper.PaperScope();
let stepData = "";

//paper.install(window);

const init = () => {
  console.log("init");
  scope_canvas_1.setup(canvas_1);
  const btn = document.querySelector(".btn");
};

window.onload = init;

const stepFile = generateStepFile(data);
//console.log(stepFile);

document.addEventListener("keydown", async (event) => {
  if (event.ctrlKey || event.metaKey) {
    if (event.code == "KeyC") await copyToClipBoard();
    if (event.code == "KeyV") {
      const text = await pasteFromClipBoard();
      console.log(cc_msg + "clipboard text = \n" + cc_reset + text);
      const path2Ddata = parseSVG(text, scope_canvas_1);
      console.log(cc_msg + "path2Ddata = \n" + cc_reset, path2Ddata);
      svgPathItems = svgPathItems.concat(
        structuredClone(createSVGPathItems(path2Ddata, scope_canvas_1))
      );
      console.log(cc_msg + "svgPathItems = \n" + cc_reset, svgPathItems);
      drawSVGPathItems(svgPathItems, scope_canvas_1); // draw Paths
      stepData = createStepFromSVGPathItems(svgPathItems); // create STEP file
      //const pathData = convertSVGPathItemsToSpline(svgPathItems);
      //console.log(cc_msg + "pathData = \n" + cc_reset, pathData);
      //drawDot(10, scope_canvas_1);
      console.log(cc_msg + "stepData = \n" + cc_reset, stepData);
    }
  }
});

function drawDot(diameter, scope) {
  const dot = new scope_canvas_1.Path.Rectangle({
    point: [scope.view.center.x - diameter / 2, scope.view.center.y - diameter / 2],
    size: [diameter, diameter],
    //fillColor: "blue",
  });
  dot.style = {
    strokeColor: "black",
  };
}

btn.addEventListener(
  "click",
  () => {
    let fileName = "download.step";
    let url = "data:image/svg+xml;utf8," + encodeURIComponent(stepData);
    let element = document.createElement("a");
    element.download = fileName;
    element.target = "_blank";
    element.href = url;
    element.click();
  },
  false
);

// function downloadSTEPFile() {
//   let fileName = "download.step";
//   let url = "data:image/svg+xml;utf8," + encodeURIComponent(stepData);
//   var link = document.createElement("a");
//   link.download = fileName;
//   link.href = url;
//   link.click();
// }
