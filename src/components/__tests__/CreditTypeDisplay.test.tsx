import { render, screen } from '@testing-library/react';
import { CreditTypeDisplay } from '../CreditTypeDisplay';
import { CreditType } from '@/types/credit';

describe('CreditTypeDisplay', () => {
  it('renders investment credit type with correct label', () => {
    render(<CreditTypeDisplay creditType="investment" />);
    expect(screen.getByText('Инвестиционный')).toBeInTheDocument();
  });

  it('renders working capital credit type with correct label', () => {
    render(<CreditTypeDisplay creditType="working_capital" />);
    expect(screen.getByText('Оборотные средства')).toBeInTheDocument();
  });

  it('applies blue styling for investment type', () => {
    const { container } = render(<CreditTypeDisplay creditType="investment" />);
    const badge = container.querySelector('.bg-blue-100');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-blue-800', 'border-blue-200');
  });

  it('applies green styling for working capital type', () => {
    const { container } = render(<CreditTypeDisplay creditType="working_capital" />);
    const badge = container.querySelector('.bg-green-100');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-green-800', 'border-green-200');
  });

  it('accepts custom className prop', () => {
    const { container } = render(
      <CreditTypeDisplay creditType="investment" className="custom-class" />
    );
    const badge = container.querySelector('.custom-class');
    expect(badge).toBeInTheDocument();
  });
});
