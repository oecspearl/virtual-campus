const crypto = require('crypto');

// Your private key from the terminal
const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDgNCU2924mxU8I
o02hiOg/j1mzK57ATAivphkfM48kIemi5sRMkN1+HSWIudhrhMFfUm6fbjTPaG/x
GeN/CKImMsGO4hr4iGZg/LCIsLSKABjG9V4mgtGnpreQ/mYSlj1dJYi+v2qkM3D3
y1na2iBC8CUD4/eYW9A1/3RkzqboOU5qNDDGilwhGZjyg1U/gYcQOluW1XVs8g6i
gf2uKp6lFxndvww7otuHwwHXt7qa4TDVrTUFH+hG5PmOHdoSank9692nwfA0kG1S
pxU2IWYdTTNJbV62IT9I71n1/40NdnTX/EoSqbrpvH7mBtvJ4Fx2EWR0Hkf5Umlz
yiv9A1sTAgMBAAECggEABrXxvoxiLLZaLKLY54DrKj/drdoqjjdDEGgvmt36Jsrh
uzM68wf2VpFnUyW7kVEv3vtCmkfRdSztBiqXJqox4LmYh3DR4RFKxPfXuKJXJ7by
Bukq5acx+aC3IGzzI0wQCEBuE+KlaHFYLDjIzB8cR1EU6aj0NDL5GiyopZo8xCPT
SQ+D8jNBND0YYCthxHtDFap0mlBh+43Atds+J5KU8Wk21KRM5G2H60ZxaDyrpqeI
elNoQNDa1vcwDZv17X7U2QYxFw6fKnmhKGQjq6dGz0wTWN2w9Jr2cghfJjIBsGOo
IZvppym9+vIsuF8tqoZ6I/2n1VjzO40Qx2yqYX8MSQKBgQD5ZfAmmubxSW3ksRHK
ItxEG7hFYT8dqONuMJ9UAeRpc/Mk5VCS/YqulHtvW/wMNHniaLKdqsjCLgyJOlEz
+JBj63kmQAA0gN3uDWZ/C1nAfXwXktXnNI/J5Y83rpwwwZQq0mxkeVgtF28asopZ
ZlWUXtg+VpGbCe4PorJLH01M+wKBgQDmI3mnlt2QA/eT7al3PCbB4W9H3hfD2qAi
YnLL/aggwvlHfXi04BNcEO/MXigHjO3iGm1/byJ2Zx2pdtpJ/fDVV7xT/GzPhNCN
z9a7VH9jZdvMTwCAzGxpBu3rFpheLjqLSHRkMX5qHHAbFVETQk9WMWxfjxhoKoXI
RM7DVD2eyQKBgQCcH2ZApIOh1HfIy9f5E+2TbU7jj8b1CD6nQiTbb/vOz9kL5cmU
2scwFp9WzNxxv3/1bdkyvjDC7hTG6wzeXeH1yviiKzp1o55KYXUiXramu2ctUqw4
+jxxBRWso8/+7Y+VZviXxSafw6W3rsDQyjEUmnMAQy0PQx4WB6FZSZUYdQKBgELU
NGSVK7vBWyiK0DY+smaEp0LwXGhUWUIC4qEYBLWWyLqY1e94Tkbi6C+pe+hNZVrO
H9Psms5VPUjTqano4wGg26Br4dEVGVbE7u8xJ1je4Efg/R1pv2V0TKyCwDZBKGD/
5kSeFr6LiYZj10pHbDB0Y6sQK588EeNJD92q3cX5AoGBAMsN0hOyAy7LQHa33lLK
psbOQdt8EFOBfeApWwY0ZS71/ocoK+k04h8h0nvNN9hAPgKBKKO0jHasD95eLNrR
tQNTRK5HU5D9WewPYAMD9CL3sQ9glQfDzj5YVawJC6rpkwEJ7On4jFfJ/OWFEoS0
+jVuua6kZSAe6B1w4U2hqydo
-----END PRIVATE KEY-----`;

try {
  const keyObject = crypto.createPrivateKey({
    key: privateKey,
    format: 'pem',
    type: 'pkcs8'
  });
  const publicKeyObj = crypto.createPublicKey(keyObject);
  const publicKey = publicKeyObj.export({
    format: 'pem',
    type: 'spki'
  });
  
  console.log('=== PUBLIC KEY ===');
  console.log(publicKey);
  console.log('\n=== SQL QUERY ===');
  
  // Escape single quotes for SQL
  const publicKeyEscaped = publicKey.replace(/'/g, "''");
  const privateKeyEscaped = privateKey.replace(/'/g, "''");
  
  const sql = `INSERT INTO lti_platform_config (
  issuer,
  platform_public_key,
  platform_private_key,
  authorization_server,
  token_endpoint,
  jwks_uri
) VALUES (
  'http://localhost:3000',
  '${publicKeyEscaped.replace(/\n/g, '\\n')}',
  '${privateKeyEscaped.replace(/\n/g, '\\n')}',
  'http://localhost:3000/api/lti/token',
  'http://localhost:3000/api/lti/token',
  'http://localhost:3000/api/lti/jwks'
);`;
  
  console.log(sql);
} catch (error) {
  console.error('Error:', error.message);
}

