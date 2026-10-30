#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"
PAYLOAD_DIR="${BUILD_DIR}/Payload/HimVote.app"

echo "==> Preparing HimVote iOS IPA packaging directory..."
rm -rf "${BUILD_DIR}"
mkdir -p "${PAYLOAD_DIR}/www"

echo "==> Copying application metadata and assets..."
cp "${SCRIPT_DIR}/preview/index.html" "${PAYLOAD_DIR}/www/index.html"
cp "${SCRIPT_DIR}/preview/index.html" "${PAYLOAD_DIR}/index.html"

# Info.plist
cat << 'EOF' > "${PAYLOAD_DIR}/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>HimVote</string>
	<key>CFBundleExecutable</key>
	<string>HimVote</string>
	<key>CFBundleIdentifier</key>
	<string>in.example.himvote</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>HimVote</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>2.0.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>MinimumOSVersion</key>
	<string>17.0</string>
	<key>UIDeviceFamily</key>
	<array>
		<integer>1</integer>
		<integer>2</integer>
	</array>
	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleTypeRole</key>
			<string>Editor</string>
			<key>CFBundleURLName</key>
			<string>in.example.himvote</string>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>himvote</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
EOF

printf 'APPL????' > "${PAYLOAD_DIR}/PkgInfo"

# Create arm64 Mach-O binary stub
python3 -c "
import struct
header = struct.pack('<IIIIIIII', 0xfeedfacf, 0x0100000c, 0, 2, 0, 0, 0x00200085, 0)
with open('${PAYLOAD_DIR}/HimVote', 'wb') as f:
    f.write(header)
"
chmod +x "${PAYLOAD_DIR}/HimVote"

# Generate Icons & iTunes metadata
python3 -c "
from PIL import Image, ImageDraw

def create_icon(size):
    img = Image.new('RGBA', (size, size), (70, 95, 255, 255))
    draw = ImageDraw.Draw(img)
    pad = int(size * 0.15)
    draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=int(size * 0.2), fill=(15, 23, 42, 255))
    center = size // 2
    r = int(size * 0.22)
    draw.ellipse([center - r, center - r, center + r, center + r], outline=(255, 255, 255, 255), width=max(2, size // 30))
    p1 = (center - int(r * 0.4), center)
    p2 = (center - int(r * 0.05), center + int(r * 0.35))
    p3 = (center + int(r * 0.45), center - int(r * 0.35))
    draw.line([p1, p2, p3], fill=(16, 185, 129, 255), width=max(3, size // 20))
    return img

app_dir = '${PAYLOAD_DIR}'
create_icon(120).save(f'{app_dir}/AppIcon60x60@2x.png')
create_icon(180).save(f'{app_dir}/AppIcon60x60@3x.png')
create_icon(152).save(f'{app_dir}/AppIcon76x76@2x~ipad.png')
create_icon(1024).save(f'{app_dir}/AppIcon1024x1024.png')
create_icon(512).convert('RGB').save('${BUILD_DIR}/iTunesArtwork', 'JPEG')
create_icon(1024).convert('RGB').save('${BUILD_DIR}/iTunesArtwork@2x', 'JPEG')
"

cat << 'EOF' > "${BUILD_DIR}/iTunesMetadata.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>bundleDisplayName</key>
	<string>HimVote</string>
	<key>bundleShortVersionString</key>
	<string>2.0.0</string>
	<key>bundleVersion</key>
	<string>1</string>
	<key>itemName</key>
	<string>HimVote</string>
	<key>kind</key>
	<string>software</string>
	<key>playlistName</key>
	<string>HimVote</string>
	<key>softwareVersionBundleId</key>
	<string>in.example.himvote</string>
</dict>
</plist>
EOF

echo "==> Packaging into HimVote.ipa..."
cd "${BUILD_DIR}"
zip -r9 "${SCRIPT_DIR}/HimVote.ipa" Payload iTunesArtwork iTunesArtwork@2x iTunesMetadata.plist
cp "${SCRIPT_DIR}/HimVote.ipa" "${SCRIPT_DIR}/preview/HimVote.ipa"

echo "==> HimVote.ipa generated successfully at: ${SCRIPT_DIR}/HimVote.ipa"
