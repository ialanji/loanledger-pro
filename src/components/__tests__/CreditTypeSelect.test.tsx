import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreditTypeSelect } from '../CreditTypeSelect';
import { CreditType } from '@/types/credit';

describe('CreditTypeSelect', () => {
  it('renders with default investment value', () => {
    const mockOnChange = jest.fn();
    render(
      <CreditTypeSelect
        value="investment"
        onValueChange={mockOnChange}
      />
    );
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays correct label for investment type', () => {
    const mockOnChange = jest.fn();
    render(
      <CreditTypeSelect
        value="investment"
        onValueChange={mockOnChange}
      />
    );
    
    expect(screen.getByText('Инвестиционный')).toBeInTheDocument();
  });

  it('displays correct label for working_capital type', () => {
    const mockOnChange = jest.fn();
    render(
      <CreditTypeSelect
        value="working_capital"
        onValueChange={mockOnChange}
      />
    );
    
    expect(screen.getByText('Оборотные средства')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    const mockOnChange = jest.fn();
    render(
      <CreditTypeSelect
        value="investment"
        onValueChange={mockOnChange}
        disabled={true}
      />
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });

  it('opens dropdown when clicked', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(
      <CreditTypeSelect
        value="investment"
        onValueChange={mockOnChange}
      />
    );
    
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    
    // Both options should be visible
    expect(screen.getAllByText('Инвестиционный')).toHaveLength(2); // One in trigger, one in dropdown
    expect(screen.getByText('Оборотные средства')).toBeInTheDocument();
  });

  it('calls onValueChange when option is selected', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(
      <CreditTypeSelect
        value="investment"
        onValueChange={mockOnChange}
      />
    );
    
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    
    const workingCapitalOption = screen.getByRole('option', { name: 'Оборотные средства' });
    await user.click(workingCapitalOption);
    
    expect(mockOnChange).toHaveBeenCalledWith('working_capital');
  });
});
