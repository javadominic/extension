import struct, zlib, os

def make_png(size, r, g, b):
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)
    raw = b''
    for y in range(size):
        raw += b'\x00'
        for x in range(size):
            raw += bytes([r, g, b])
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

os.makedirs('public/icons', exist_ok=True)
for size in [16, 48, 128]:
    with open(f'public/icons/icon{size}.png', 'wb') as f:
        f.write(make_png(size, 99, 102, 241))
    print(f'Created icon{size}.png')
print('All icons created.')
