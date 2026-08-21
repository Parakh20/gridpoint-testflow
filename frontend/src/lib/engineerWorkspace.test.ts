import { describe, it, expect } from 'vitest';
import { deriveEquipmentStatus, getDraftStatus } from './engineerWorkspace';

describe('deriveEquipmentStatus', () => {
  it('returns APPROVED when every task is approved', () => {
    expect(deriveEquipmentStatus(['APPROVED', 'APPROVED'], true)).toBe('APPROVED');
  });

  it('returns REWORK when any task is REWORK, even alongside APPROVED siblings', () => {
    expect(deriveEquipmentStatus(['APPROVED', 'REWORK'], true)).toBe('REWORK');
  });

  it('returns SUBMITTED when any task is SUBMITTED and none are REWORK', () => {
    expect(deriveEquipmentStatus(['APPROVED', 'SUBMITTED'], true)).toBe('SUBMITTED');
  });

  it('returns IN_PROGRESS when a task is IN_PROGRESS or APPROVED but the set is not all-approved/submitted/rework', () => {
    expect(deriveEquipmentStatus(['IN_PROGRESS', 'DRAFT'], true)).toBe('IN_PROGRESS');
  });

  it('returns UNASSIGNED for an empty task list with no assignee (does not vacuously match APPROVED)', () => {
    expect(deriveEquipmentStatus([], false)).toBe('UNASSIGNED');
  });

  it('returns ASSIGNED for an empty task list with an assignee', () => {
    expect(deriveEquipmentStatus([], true)).toBe('ASSIGNED');
  });

  it('returns UNASSIGNED as the fallback for an unrecognized status set with no assignee', () => {
    expect(deriveEquipmentStatus(['DRAFT'], false)).toBe('UNASSIGNED');
  });
});

describe('getDraftStatus', () => {
  it('returns submitted for a SUBMITTED task', () => {
    expect(getDraftStatus({ status: 'SUBMITTED' }, {})).toBe('submitted');
  });

  it('returns approved for an APPROVED task', () => {
    expect(getDraftStatus({ status: 'APPROVED' }, {})).toBe('approved');
  });

  it('returns draft when local formData has keys and no existing_record', () => {
    expect(getDraftStatus({ status: 'DRAFT' }, { reading: 12 })).toBe('draft');
  });

  it('returns clean when a saved record already exists (not a pending draft)', () => {
    expect(getDraftStatus({ status: 'IN_PROGRESS', existing_record: { id: 'r1' } }, { reading: 12 })).toBe('clean');
  });

  it('returns clean when formData is empty/undefined', () => {
    expect(getDraftStatus({ status: 'DRAFT' }, undefined)).toBe('clean');
  });
});
