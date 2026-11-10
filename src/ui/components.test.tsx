import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, DiscLoader, Panel, Rail, RailItem } from './components';

describe('Button', () => {
  it('renders as a button with the chosen variant', () => {
    render(<Button variant="primary">Spin</Button>);
    const btn = screen.getByRole('button', { name: 'Spin' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('btn', 'btn--primary');
    expect(btn).toHaveAttribute('type', 'button');
  });
});

describe('Panel', () => {
  it('renders a titled region', () => {
    render(<Panel title="Facts">content</Panel>);
    expect(
      screen.getByRole('heading', { name: 'Facts', level: 2 }),
    ).toBeInTheDocument();
  });
});

describe('Rail', () => {
  it('is a bounded labelled list', () => {
    render(
      <Rail label="Related trails">
        <RailItem>one</RailItem>
        <RailItem>two</RailItem>
      </Rail>,
    );
    const list = screen.getByRole('list', { name: 'Related trails' });
    expect(list).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('DiscLoader', () => {
  it('exposes an accessible status with a text label', () => {
    render(<DiscLoader label="Loading the disc" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading the disc');
  });
});
