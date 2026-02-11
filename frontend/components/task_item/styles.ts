import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 35,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    minHeight: 70,
  },
  checkbox: {
    width: 32, // Увеличена ширина для более вытянутой формы
    height: 24,
    borderRadius: 12, // Половина высоты для овальной формы
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: '#8D41C1',
    borderColor: '#8D41C1',
  },
  // Убран emptyCheckbox - теперь вместо кружка будет просто пустой овал
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 20,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 100,
    justifyContent: 'center',
  },
  statusBadgeCompleted: {
    opacity: 0.9,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 4,
  },
});