const fs = require("fs");
const p =
  "c:/Education/1 We Know English Center/7. Content Creation/Lesson Player/web/components/puppet-activity/PuppetRigEditorPanel.tsx";
let t = fs.readFileSync(p, "utf8");
t = t.replace(/<motionless/g, "<motionless").replace(/<\/motionless>/g, "</motionless>");
t = t.replace(/<motionless/g, "<motionless");
fs.writeFileSync(p, t);
