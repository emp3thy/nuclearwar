import json

d = json.load(open('ne110m.json'))

def rdp(points, epsilon):
    if len(points) < 3:
        return points
    (x1, y1) = points[0]
    (x2, y2) = points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = (dx * dx + dy * dy) ** 0.5
    dmax = 0.0
    idx = 0
    for i in range(1, len(points) - 1):
        (x0, y0) = points[i]
        if norm == 0:
            d = ((x0 - x1) ** 2 + (y0 - y1) ** 2) ** 0.5
        else:
            d = abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / norm
        if d > dmax:
            idx = i
            dmax = d
    if dmax > epsilon:
        left = rdp(points[:idx + 1], epsilon)
        right = rdp(points[idx:], epsilon)
        return left[:-1] + right
    else:
        return [points[0], points[-1]]

def ring_to_pts(ring):
    pts = [(lon + 180.0, 90.0 - lat) for lon, lat in ring]
    cleaned = [pts[0]]
    for p in pts[1:]:
        if p != cleaned[-1]:
            cleaned.append(p)
    return cleaned

def fmt(v):
    return f"{v:g}"

def pts_to_path(pts, epsilon):
    if len(pts) < 3:
        return ""
    if pts[0] != pts[-1]:
        pts = pts + [pts[0]]
    simplified = rdp(pts, epsilon)
    simplified = [(round(x, 1), round(y, 1)) for x, y in simplified]
    if len(simplified) < 4:
        return ""
    s = "M" + f"{fmt(simplified[0][0])},{fmt(simplified[0][1])}"
    for p in simplified[1:]:
        s += f"L{fmt(p[0])},{fmt(p[1])}"
    s += "Z"
    return s

EPS = 0.15
MIN_RING_BBOX = 0.0  # degrees^2 area threshold to drop tiny islands; 0 = keep all

parts = []
dropped = 0
for feat in d['features']:
    geom = feat['geometry']
    polys = [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']
    for poly in polys:
        for ring in poly:
            pts = ring_to_pts(ring)
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            bbox_area = (max(xs)-min(xs)) * (max(ys)-min(ys))
            if bbox_area < MIN_RING_BBOX:
                dropped += 1
                continue
            p = pts_to_path(pts, EPS)
            if p:
                parts.append(p)

path_d = "".join(parts)
print("epsilon:", EPS, "num rings kept:", len(parts), "dropped:", dropped)
print("path length (chars):", len(path_d))

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 180">
<path d="{path_d}" fill="#4a7c59" fill-rule="evenodd" stroke="none"/>
</svg>
'''

with open('worldsrc.svg', 'w') as f:
    f.write(svg)

print("svg byte size:", len(svg.encode('utf-8')))
