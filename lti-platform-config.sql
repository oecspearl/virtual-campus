-- LTI Platform Configuration
-- Run this in your Supabase SQL Editor

INSERT INTO lti_platform_config (
  issuer,
  platform_public_key,
  platform_private_key,
  authorization_server,
  token_endpoint,
  jwks_uri
) VALUES (
  'http://localhost:3000',
  E'-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4DQlNvduJsVPCKNNoYjo\nP49ZsyuewEwIr6YZHzOPJCHpoubETJDdfh0liLnYa4TBX1Jun240z2hv8Rnjfwii\nJjLBjuIa+IhmYPywiLC0igAYxvVeJoLRp6a3kP5mEpY9XSWIvr9qpDNw98tZ2tog\nQvAlA+P3mFvQNf90ZM6m6DlOajQwxopcIRmY8oNVP4GHEDpbltV1bPIOooH9riqe\npRcZ3b8MO6Lbh8MB17e6muEw1a01BR/oRuT5jh3aEmp5Pevdp8HwNJBtUqcVNiFm\nHU0zSW1etiE/SO9Z9f+NDXZ01/xKEqm66bx+5gbbyeBcdhFkdB5H+VJpc8or/QNb\nEwIDAQAB\n-----END PUBLIC KEY-----',
  E'-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDgNCU2924mxU8I\no02hiOg/j1mzK57ATAivphkfM48kIemi5sRMkN1+HSWIudhrhMFfUm6fbjTPaG/x\nGeN/CKImMsGO4hr4iGZg/LCIsLSKABjG9V4mgtGnpreQ/mYSlj1dJYi+v2qkM3D3\ny1na2iBC8CUD4/eYW9A1/3RkzqboOU5qNDDGilwhGZjyg1U/gYcQOluW1XVs8g6i\ngf2uKp6lFxndvww7otuHwwHXt7qa4TDVrTUFH+hG5PmOHdoSank9692nwfA0kG1S\npxU2IWYdTTNJbV62IT9I71n1/40NdnTX/EoSqbrpvH7mBtvJ4Fx2EWR0Hkf5Umlz\nyiv9A1sTAgMBAAECggEABrXxvoxiLLZaLKLY54DrKj/drdoqjjdDEGgvmt36Jsrh\nuzM68wf2VpFnUyW7kVEv3vtCmkfRdSztBiqXJqox4LmYh3DR4RFKxPfXuKJXJ7by\nBukq5acx+aC3IGzzI0wQCEBuE+KlaHFYLDjIzB8cR1EU6aj0NDL5GiyopZo8xCPT\nSQ+D8jNBND0YYCthxHtDFap0mlBh+43Atds+J5KU8Wk21KRM5G2H60ZxaDyrpqeI\nelNoQNDa1vcwDZv17X7U2QYxFw6fKnmhKGQjq6dGz0wTWN2w9Jr2cghfJjIBsGOo\nIZvppym9+vIsuF8tqoZ6I/2n1VjzO40Qx2yqYX8MSQKBgQD5ZfAmmubxSW3ksRHK\nItxEG7hFYT8dqONuMJ9UAeRpc/Mk5VCS/YqulHtvW/wMNHniaLKdqsjCLgyJOlEz\n+JBj63kmQAA0gN3uDWZ/C1nAfXwXktXnNI/J5Y83rpwwwZQq0mxkeVgtF28asopZ\nZlWUXtg+VpGbCe4PorJLH01M+wKBgQDmI3mnlt2QA/eT7al3PCbB4W9H3hfD2qAi\nYnLL/aggwvlHfXi04BNcEO/MXigHjO3iGm1/byJ2Zx2pdtpJ/fDVV7xT/GzPhNCN\nz9a7VH9jZdvMTwCAzGxpBu3rFpheLjqLSHRkMX5qHHAbFVETQk9WMWxfjxhoKoXI\nRM7DVD2eyQKBgQCcH2ZApIOh1HfIy9f5E+2TbU7jj8b1CD6nQiTbb/vOz9kL5cmU\n2scwFp9WzNxxv3/1bdkyvjDC7hTG6wzeXeH1yviiKzp1o55KYXUiXramu2ctUqw4\n+jxxBRWso8/+7Y+VZviXxSafw6W3rsDQyjEUmnMAQy0PQx4WB6FZSZUYdQKBgELU\nNGSVK7vBWyiK0DY+smaEp0LwXGhUWUIC4qEYBLWWyLqY1e94Tkbi6C+pe+hNZVrO\nH9Psms5VPUjTqano4wGg26Br4dEVGVbE7u8xJ1je4Efg/R1pv2V0TKyCwDZBKGD/\n5kSeFr6LiYZj10pHbDB0Y6sQK588EeNJD92q3cX5AoGBAMsN0hOyAy7LQHa33lLK\npsbOQdt8EFOBfeApWwY0ZS71/ocoK+k04h8h0nvNN9hAPgKBKKO0jHasD95eLNrR\ntQNTRK5HU5D9WewPYAMD9CL3sQ9glQfDzj5YVawJC6rpkwEJ7On4jFfJ/OWFEoS0\n+jVuua6kZSAe6B1w4U2hqydo\n-----END PRIVATE KEY-----',
  'http://localhost:3000/api/lti/token',
  'http://localhost:3000/api/lti/token',
  'http://localhost:3000/api/lti/jwks'
);

