import type { SCORMBuilderData } from './types';

/**
 * Generate a SCORM 2004 4th Edition imsmanifest.xml from builder data.
 */
export function buildManifestXml(data: SCORMBuilderData): string {
  const id = `scorm-${Date.now()}`;
  const orgId = `org-${id}`;
  const itemId = `item-${id}`;
  const resourceId = `res-${id}`;

  // Escape XML special characters
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}"
  version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                       http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="${orgId}">
    <organization identifier="${orgId}">
      <title>${esc(data.title)}</title>
      <item identifier="${itemId}" identifierref="${resourceId}">
        <title>${esc(data.title)}</title>
        <adlcp:masteryscore>${data.settings.passingScore}</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${resourceId}" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm-api.js"/>
      <file href="style.css"/>
    </resource>
  </resources>
</manifest>`;
}
