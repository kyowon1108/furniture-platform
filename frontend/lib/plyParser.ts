/**
 * Custom PLY parser that properly handles face data.
 * Three.js PLYLoader sometimes fails to load face indices correctly.
 */

import * as THREE from 'three';

interface PLYHeader {
  format: 'ascii' | 'binary_little_endian' | 'binary_big_endian';
  vertexCount: number;
  faceCount: number;
  vertexProperties: string[];
  faceProperties: string[];
}

export async function parsePLYWithFaces(url: string, token: string): Promise<THREE.BufferGeometry> {
  // Fetch the PLY file
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const text = await response.text();
  const lines = text.split('\n');
  
  // Parse header
  const header = parseHeader(lines);
  console.log('PLY Header:', header);
  
  if (header.format !== 'ascii') {
    throw new Error(`Only ASCII PLY format is supported. Got: ${header.format}`);
  }
  
  // Find where header ends
  const headerEndIndex = lines.findIndex(line => line.trim() === 'end_header');
  const dataLines = lines.slice(headerEndIndex + 1);
  
  // Parse vertices
  const vertices: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  
  for (let i = 0; i < header.vertexCount; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;
    
    const values = line.split(/\s+/).map(v => parseFloat(v));
    
    // Position (x, y, z)
    vertices.push(values[0], values[1], values[2]);
    
    // Normal (nx, ny, nz)
    if (header.vertexProperties.includes('nx')) {
      normals.push(values[3], values[4], values[5]);
    }
    
    // Color (red, green, blue) - convert from 0-255 to 0-1
    if (header.vertexProperties.includes('red')) {
      const colorOffset = header.vertexProperties.includes('nx') ? 6 : 3;
      colors.push(
        values[colorOffset] / 255,
        values[colorOffset + 1] / 255,
        values[colorOffset + 2] / 255
      );
    }
  }
  
  // Parse faces
  const indices: number[] = [];
  
  for (let i = header.vertexCount; i < header.vertexCount + header.faceCount; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;
    
    const values = line.split(/\s+/).map(v => parseInt(v));
    const vertexCount = values[0]; // First value is the number of vertices in this face
    
    if (vertexCount === 3) {
      // Triangle
      indices.push(values[1], values[2], values[3]);
    } else if (vertexCount === 4) {
      // Quad - split into two triangles
      indices.push(values[1], values[2], values[3]);
      indices.push(values[1], values[3], values[4]);
    }
  }
  
  console.log('Parsed PLY:');
  console.log('  Vertices:', vertices.length / 3);
  console.log('  Faces:', indices.length / 3);
  console.log('  Has normals:', normals.length > 0);
  console.log('  Has colors:', colors.length > 0);
  
  // Create BufferGeometry
  const geometry = new THREE.BufferGeometry();
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  
  if (normals.length > 0) {
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  }
  
  if (colors.length > 0) {
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }
  
  if (indices.length > 0) {
    geometry.setIndex(indices);
  }
  
  // Compute bounding box and sphere
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  
  // Compute normals if not present
  if (normals.length === 0) {
    geometry.computeVertexNormals();
  }
  
  return geometry;
}

function parseHeader(lines: string[]): PLYHeader {
  const header: PLYHeader = {
    format: 'ascii',
    vertexCount: 0,
    faceCount: 0,
    vertexProperties: [],
    faceProperties: [],
  };
  
  let currentElement = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === 'end_header') {
      break;
    }
    
    if (trimmed.startsWith('format ')) {
      const format = trimmed.split(' ')[1];
      header.format = format as any;
    } else if (trimmed.startsWith('element vertex ')) {
      header.vertexCount = parseInt(trimmed.split(' ')[2]);
      currentElement = 'vertex';
    } else if (trimmed.startsWith('element face ')) {
      header.faceCount = parseInt(trimmed.split(' ')[2]);
      currentElement = 'face';
    } else if (trimmed.startsWith('property ')) {
      const parts = trimmed.split(' ');
      const propName = parts[parts.length - 1];
      
      if (currentElement === 'vertex') {
        header.vertexProperties.push(propName);
      } else if (currentElement === 'face') {
        header.faceProperties.push(propName);
      }
    }
  }
  
  return header;
}
